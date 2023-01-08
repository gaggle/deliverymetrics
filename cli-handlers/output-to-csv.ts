import { CSVWriteCellOptions, CSVWriterOptions, writeCSVObjects } from "csv";
import { ensureFile } from "std:fs";
import { join } from "std:path";
import { makeRunWithLimit as makeLimit } from "run-with-limit";

import { ActionWorkflow, getGithubClient, GithubPull, githubPullSchema } from "../github/mod.ts";
import { yieldActionRunHistogram, yieldPullRequestLeadTime } from "../metrics/mod.ts";

import { asyncToArray, filterIter, inspectIter } from "../utils.ts";
import { ToTuple } from "../types.ts";
import { withFileOpen, withTempFile } from "../path-and-file-utils.ts";

import { dot, formatGithubClientStatus } from "./formatting.ts";

export async function outputToCsv(
  {
    github,
    outputDir,
    persistenceRoot,
  }: {
    github: { owner: string; repo: string };
    outputDir: string;
    persistenceRoot: string;
  },
) {
  const gh = await _internals.getGithubClient({
    type: "ReadonlyGithubClient",
    persistenceDir: join(persistenceRoot, "github", github.owner, github.repo),
    owner: github.owner,
    repo: github.repo,
  });
  console.log(await formatGithubClientStatus(gh, { mostRecent: false, unclosed: false }));

  const latestSync = await gh.findLatestSync();

  const { runWithLimit: limit } = makeLimit(2);

  await Promise.all([
    ...((await asyncToArray(gh.findActionWorkflows())).map((workflow) =>
      limit(() =>
        writeCSVToFile(
          join(outputDir, "workflows", workflow.name, "histogram-daily.csv"),
          inspectIter(
            () => dot(),
            actionsRunAsCsv(
              yieldActionRunHistogram(gh, { mode: "daily", branch: "main", conclusion: "success", workflow }),
              workflow,
            ),
          ),
          { header: actionsRunHeaders.slice() as Array<string> },
        )
      )
    )),
    limit(() =>
      writeCSVToFile(
        join(outputDir, "all-pull-request-data.csv"),
        inspectIter(
          () => dot(),
          githubPullsAsCsv(gh.findPulls({ sort: { key: "created_at", order: "asc" } })),
        ),
        { header: prHeaders.slice() as Array<string> },
      )
    ),
    limit(() =>
      writeCSVToFile(
        join(outputDir, "pull-request-lead-times-daily.csv"),
        inspectIter(
          () => dot(),
          prLeadTimeAsCsv(yieldPullRequestLeadTime(gh, { mode: "daily" })),
        ),
        { header: leadTimeHeaders.slice() },
      )
    ),
    limit(() =>
      writeCSVToFile(
        join(outputDir, "pull-request-lead-times-weekly.csv"),
        inspectIter(
          () => dot(),
          prLeadTimeAsCsv(yieldPullRequestLeadTime(gh, { mode: "weekly" })),
        ),
        { header: leadTimeHeaders.slice() },
      )
    ),
    limit(() =>
      writeCSVToFile(
        join(outputDir, "pull-request-lead-times-monthly.csv"),
        inspectIter(
          () => dot(),
          prLeadTimeAsCsv(yieldPullRequestLeadTime(gh, { mode: "monthly" })),
        ),
        { header: leadTimeHeaders.slice() },
      )
    ),
    latestSync && limit(() =>
      writeCSVToFile(
        join(outputDir, "pull-request-lead-times-30d.csv"),
        inspectIter(
          () => dot(),
          prLeadTimeAsCsv(
            filterIter(
              (el) => latestSync.updatedAt ? daysBetween(el.start, new Date(latestSync.updatedAt)) < 30 : false,
              yieldPullRequestLeadTime(gh, { mode: "daily" }),
            ),
          ),
        ),
        { header: leadTimeHeaders.slice() },
      )
    ),
  ]);
}

function toDays(duration: number): number {
  return Math.ceil(duration / (24 * 60 * 60 * 1000));
  //                           hour min  sec  ms;
}

function daysBetween(then: Date, now: Date): number {
  const msBetweenDates = Math.abs(then.getTime() - now.getTime());
  return msBetweenDates / (24 * 60 * 60 * 1000);
  //                       hour min  sec  ms
}

const prPrimaryHeaders = [
  "number",
  "created_at",
  "merged_at",
  "updated_at",
  "was_cancelled",
] as const;
const prIgnoreHeaders = [
  "comments_url",
  "commits_url",
  "head",
  "id",
  "node_id",
  "review_comment_url",
  "review_comments_url",
  "statuses_url",
  "url",
] as const;

const prRemainingHeaders = Object.keys(githubPullSchema.shape)
  .filter((n) => !(prPrimaryHeaders.slice() as string[]).includes(n))
  .filter((n) => !(prIgnoreHeaders.slice() as string[]).includes(n)) as unknown as PrRemainingHeaders;
type PrRemainingHeaders = Readonly<
  ToTuple<keyof Omit<GithubPull, typeof prPrimaryHeaders[number] | typeof prIgnoreHeaders[number]>>
>;

const prHeaders = [...prPrimaryHeaders, ...prRemainingHeaders] as const;
export type PrRow = Record<typeof prHeaders[number], string>;

async function* githubPullsAsCsv(
  pulls: AsyncGenerator<GithubPull>,
): AsyncGenerator<PrRow> {
  for await (const pull of pulls) {
    yield {
      _links: JSON.stringify(pull._links),
      base: JSON.stringify({ ...pull.base, repo: undefined }),
      body: pull.body ? JSON.stringify(pull.body) : "",
      closed_at: pull.closed_at || "",
      created_at: pull.created_at,
      draft: pull.draft.toString(),
      html_url: pull.html_url,
      labels: pull.labels.map((el) => el.name).join("; "),
      locked: pull.locked.toString(),
      merge_commit_sha: pull.merge_commit_sha,
      merged_at: pull.merged_at || "",
      number: pull.number.toString(),
      state: pull.state,
      title: JSON.stringify(pull.title),
      updated_at: pull.updated_at,
      was_cancelled: Boolean(pull.closed_at && pull.merged_at === null)
        .toString(),
    };
  }
}

const leadTimeHeaders = [
  "Period Start",
  "Period End",
  "Lead Time (in days)",
  "# of PRs Merged",
  "Merged PRs",
];
type LeadTimeRow = Record<typeof leadTimeHeaders[number], string>;

async function* prLeadTimeAsCsv(
  iter: ReturnType<typeof yieldPullRequestLeadTime>,
): AsyncGenerator<LeadTimeRow> {
  for await (const el of iter) {
    yield {
      "Period Start": el.start.toISOString(),
      "Period End": el.end.toISOString(),
      "Lead Time (in days)": toDays(el.leadTime).toPrecision(2),
      "# of PRs Merged": el.mergedPRs.length.toString(),
      "Merged PRs": el.mergedPRs.toString(),
    };
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
  "Run URLs",
];
type ActionsRunRow = Record<typeof actionsRunHeaders[number], string>;

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
      "Run URLs": el.htmlUrls.join("; "),
    };
  }
}

async function writeCSVToFile(
  fp: string,
  iter: AsyncGenerator<{ [key: string]: string }>,
  options: Partial<CSVWriterOptions & CSVWriteCellOptions> & { header: string[] },
) {
  let hasIterated = false;
  await withTempFile(async (tmpFp) => {
    await withFileOpen(
      async (f) => {
        await writeCSVObjects(
          f,
          inspectIter(() => hasIterated = true, iter),
          options,
        );
      },
      tmpFp,
      { write: true, create: true, truncate: true },
    );

    if (hasIterated) {
      await ensureFile(fp);
      await Deno.copyFile(tmpFp, fp);
    }
  });
}

/**
 * 29/03/2022  00.00.00
 */
function toExcelDate(date: Date): string {
  const dd = date.getUTCDate().toString().padStart(2, "0");
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const yyyy = date.getUTCFullYear();

  const hr = date.getUTCHours().toString().padStart(2, "0");
  const min = date.getUTCMinutes().toString().padStart(2, "0");
  const sec = date.getUTCSeconds().toString().padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hr}.${min}.${sec}`;
}

export const _internals = {
  getGithubClient,
};
