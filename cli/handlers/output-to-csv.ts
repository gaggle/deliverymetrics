import { CSVWriteCellOptions, CSVWriterOptions, writeCSVObjects } from "csv"
import { ensureFile } from "std:fs"
import { join } from "std:path"
import { makeRunWithLimit as makeLimit } from "run-with-limit"

import {
  ActionWorkflow,
  getGithubClient,
  GithubPull,
  GithubPullCommit,
  githubPullSchema,
} from "../../libs/github/mod.ts"
import { daysBetween, toDays } from "../../libs/metrics/date-utils.ts"
import { withProgress } from "../gui/mod.ts"
import { yieldActionRunHistogram, yieldPullRequestData, yieldPullRequestHistogram } from "../../libs/metrics/mod.ts"

import { filterIter, inspectIter, sleep } from "../../libs/utils/mod.ts"
import { ToTuple } from "../../libs/types.ts"
import { withFileOpen, withTempFile } from "../../libs/utils/path-and-file-utils.ts"

import { formatGithubClientStatus } from "./formatting.ts"

function* getModes() {
  yield "daily"
  yield "weekly"
  yield "monthly"
}

export async function outputToCsv(
  {
    github,
    outputDir,
    persistenceRoot,
    excludeLabels,
  }: {
    github: { owner: string; repo: string }
    outputDir: string
    persistenceRoot: string
    excludeLabels?: Array<string | RegExp>
  },
) {
  const gh = await _internals.getGithubClient({
    type: "ReadonlyGithubClient",
    persistenceDir: join(persistenceRoot, "github", github.owner, github.repo),
    owner: github.owner,
    repo: github.repo,
  })
  console.log(await formatGithubClientStatus(gh, { mostRecent: false, unclosed: false }))

  const latestSync = await gh.findLatestSync()

  const { runWithLimit: limit } = makeLimit(3)

  await withProgress(async (progress) => {
    const jobs: Array<Promise<unknown>> = []

    for await (const workflow of gh.findActionWorkflows()) {
      for (const mode of getModes()) {
        jobs.push(limit(() =>
          writeCSVToFile(
            join(outputDir, join("workflows", workflow.name, `histogram-${mode}.csv`)),
            actionsRunAsCsv(
              inspectIter(
                () => progress.increment("workflows", { total: Number.MAX_SAFE_INTEGER }),
                yieldActionRunHistogram(gh, { mode, branch: "main", conclusion: "success", workflow }),
              ),
              workflow,
            ),
            { header: actionsRunHeaders.slice() as Array<string> },
          )
        ))
      }
    }

    if (latestSync) {
      for await (
        const pull of filterIter(
          (el) => daysBetween(new Date(el.created_at), new Date(latestSync.updatedAt!)) < 90,
          gh.findPulls({ sort: { key: "created_at", order: "asc" } }),
        )
      ) {
        jobs.push(limit(() => {
          return writeCSVToFile(
            join(outputDir, join("pull-request-commits", `pull-request-${pull.number}-data.csv`)),
            githubPullCommitsAsCsv(inspectIter(
              () => progress.increment("pull-request-commits", { total: Number.MAX_SAFE_INTEGER }),
              gh.findPullCommits({ pr: pull.number }),
            )),
            { header: prCommitHeaders.slice() as Array<string> },
          )
        }))
      }
    }

    jobs.push(limit(() => {
      return writeCSVToFile(
        join(outputDir, "pull-request-data-90d.csv"),
        githubPullsAsCsv(inspectIter(
          () => progress.increment("pull-request-data", { total: Number.MAX_SAFE_INTEGER }),
          yieldPullRequestData(gh, { maxDays: 90, excludeLabels }),
        )),
        { header: prHeaders.slice() as Array<string> },
      )
    }))

    for (const mode of getModes()) {
      jobs.push(limit(() => {
        return writeCSVToFile(
          join(outputDir, `pull-request-lead-times-${mode}-90d.csv`),
          prLeadTimeAsCsv(inspectIter(
            () => progress.increment("pull-request-lead-times", { total: Number.MAX_SAFE_INTEGER }),
            yieldPullRequestHistogram(gh, { mode, maxDays: 90, excludeLabels }),
          )),
          { header: leadTimeHeaders.slice() },
        )
      }))
    }

    await Promise.all(jobs)

    await sleep(200)
    // ↑ Through trial-and-error I found this hack where a small delay helps the tests pass reliably,
    //   presumably because the progress bar gets a bit of time to resolve itself? (or the underlying throttle)
  }, {
    title: "Outputting data",
    display: ":text [Row: :completed]",
    bars: {
      "pull-request-commits": { text: "pull-request commits", total: Number.MAX_SAFE_INTEGER },
      "pull-request-data": { text: "pull-request-data", total: Number.MAX_SAFE_INTEGER },
      "pull-request-lead-times": { text: "pull-request-lead-times", total: Number.MAX_SAFE_INTEGER },
      "workflows": { text: "workflows", total: Number.MAX_SAFE_INTEGER },
    },
  })
}

const prPrimaryHeaders = [
  "number",
  "created_at",
  "merged_at",
  "updated_at",
  "closed_at",
  "Was Cancelled?",
  "Lead Time (in days)",
  "Time to Merge (in days)",
  "commits_count",
  "commits_authors",
  "commits_committers",
  "head_ref",
] as const
const prIgnoreHeaders = [
  "_links",
  "base",
  "body",
  "comments_url",
  "commits_url",
  "head",
  "id",
  "node_id",
  "review_comment_url",
  "review_comments_url",
  "statuses_url",
  "url",
] as const

const prRemainingHeaders = Object.keys(githubPullSchema.shape)
  .filter((n) => !(prPrimaryHeaders.slice() as string[]).includes(n))
  .filter((n) => !(prIgnoreHeaders.slice() as string[]).includes(n)) as unknown as PrRemainingHeaders
type PrRemainingHeaders = Readonly<
  ToTuple<keyof Omit<GithubPull, typeof prPrimaryHeaders[number] | typeof prIgnoreHeaders[number]>>
>

const prHeaders = [...prPrimaryHeaders, ...prRemainingHeaders] as const
export type PrRow = Record<typeof prHeaders[number], string>

async function* githubPullsAsCsv(
  iter: ReturnType<typeof yieldPullRequestData>,
): AsyncGenerator<PrRow> {
  for await (const el of iter) {
    yield {
      commits_count: el.commits.length.toString(),
      commits_authors: el.commits.map((el) => el.author_name)
        .filter((v, i, a) => a.indexOf(v) === i) // Make unique
        .join("; "),
      commits_committers: el.commits.map((el) => el.committer_name)
        .filter((v, i, a) => a.indexOf(v) === i) // Make unique
        .join("; "),
      closed_at: el.pull.closed_at || "",
      created_at: el.pull.created_at,
      draft: el.pull.draft.toString(),
      head_ref: el.pull.head.ref,
      html_url: el.pull.html_url,
      labels: el.pull.labels.map((el) => el.name).join("; "),
      locked: el.pull.locked.toString(),
      merge_commit_sha: el.pull.merge_commit_sha,
      merged_at: el.pull.merged_at || "",
      number: el.pull.number.toString(),
      state: el.pull.state,
      title: JSON.stringify(el.pull.title),
      updated_at: el.pull.updated_at,
      "Lead Time (in days)": el.leadTime ? toDays(el.leadTime).toPrecision(2) : "",
      "Time to Merge (in days)": el.timeToMerge ? toDays(el.timeToMerge).toPrecision(2) : "",
      "Was Cancelled?": Boolean(el.pull.closed_at && el.pull.merged_at === null).toString(),
    }
  }
}

const prCommitHeaders = [
  "Author Date",
  "Author Name",
  "Author Email",
  "Committer Date",
  "Committer Name",
  "Committer Email",
  "HTML Url",
] as const
type PrCommitRow = Record<typeof prCommitHeaders[number], string>

async function* githubPullCommitsAsCsv(
  commits: AsyncGenerator<GithubPullCommit>,
): AsyncGenerator<PrCommitRow> {
  for await (const commit of commits) {
    yield {
      "Author Date": commit.commit.author?.date || "",
      "Author Name": commit.commit.author?.name || "",
      "Author Email": commit.commit.author?.email || "",
      "Committer Date": commit.commit.committer?.date || "",
      "Committer Name": commit.commit.committer?.name || "",
      "Committer Email": commit.commit.committer?.email || "",
      "HTML Url": commit.html_url,
    }
  }
}

const leadTimeHeaders = [
  "Period Start",
  "Period End",
  "Lead Time (in days)",
  "Time to Merge (in days)",
  "# of PRs Merged",
  "Merged PRs",
] as const
type LeadTimeRow = Record<typeof leadTimeHeaders[number], string>

async function* prLeadTimeAsCsv(
  iter: ReturnType<typeof yieldPullRequestHistogram>,
): AsyncGenerator<LeadTimeRow> {
  for await (const el of iter) {
    yield {
      "Period Start": el.start.toISOString(),
      "Period End": el.end.toISOString(),
      "Lead Time (in days)": toDays(el.leadTime).toPrecision(2),
      "Time to Merge (in days)": el.timeToMerge ? toDays(el.timeToMerge).toPrecision(2) : "",
      "# of PRs Merged": el.mergedPRs.length.toString(),
      "Merged PRs": el.mergedPRs.join("; "),
    }
  }
}

const actionsRunHeaders = [
  "Period Start",
  "Period End",
  "Name",
  "Path",
  "Invocations",
  "Conclusions",
  "Run IDs",
] as const
type ActionsRunRow = Record<typeof actionsRunHeaders[number], string>

async function* actionsRunAsCsv(
  iter: ReturnType<typeof yieldActionRunHistogram>,
  workflow: ActionWorkflow,
): AsyncGenerator<ActionsRunRow> {
  for await (const el of iter) {
    yield {
      "Period Start": toExcelDate(el.start),
      "Period End": toExcelDate(el.end),
      "Name": workflow.name,
      "Path": workflow.path,
      "Invocations": el.count.toString(),
      "Conclusions": el.conclusions.join("; "),
      "Run IDs": el.ids.join("; "),
    }
  }
}

async function writeCSVToFile(
  fp: string,
  iter: AsyncGenerator<{ [key: string]: string }>,
  options: Partial<CSVWriterOptions & CSVWriteCellOptions> & { header: string[] },
) {
  let hasIterated = false
  await withTempFile(async (tmpFp) => {
    await withFileOpen(
      async (f) => {
        await writeCSVObjects(
          f,
          inspectIter(() => hasIterated = true, iter),
          options,
        )
      },
      tmpFp,
      { write: true, create: true, truncate: true },
    )

    if (hasIterated) {
      await ensureFile(fp)
      await Deno.copyFile(tmpFp, fp)
    }
  })
}

/**
 * 29/03/2022  00.00.00
 */
function toExcelDate(date: Date): string {
  const dd = date.getUTCDate().toString().padStart(2, "0")
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, "0")
  const yyyy = date.getUTCFullYear()

  const hr = date.getUTCHours().toString().padStart(2, "0")
  const min = date.getUTCMinutes().toString().padStart(2, "0")
  const sec = date.getUTCSeconds().toString().padStart(2, "0")
  return `${yyyy}/${mm}/${dd} ${hr}.${min}.${sec}`
}

export const _internals = {
  getGithubClient,
}
