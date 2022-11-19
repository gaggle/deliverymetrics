import { GithubDiskCache, GithubPull, githubPullSchema, ReadonlyGithubClient } from "../github/mod.ts";
import { yieldPullRequestLeadTime } from "../metrics/mod.ts";

import { conversion, csv, fs, path } from "../deps.ts";
import { Tail, ToTuple } from "../types.ts";
import { withFileOpen } from "../path-and-file-utils.ts";

import { formatGithubClientStatus } from "./formatting.ts";

const prPrimaryHeaders = ["number", "created_at", "merged_at", "updated_at", "was_cancelled",] as const;
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
  .filter(n => !(prPrimaryHeaders.slice() as string[]).includes(n))
  .filter(n => !(prIgnoreHeaders.slice() as string[]).includes(n)) as unknown as PrRemainingHeaders;
type PrRemainingHeaders = Readonly<ToTuple<keyof Omit<GithubPull, typeof prPrimaryHeaders[number] | typeof prIgnoreHeaders[number]>>>

const prHeaders = [...prPrimaryHeaders, ...prRemainingHeaders] as const;
export type PrRow = Record<typeof prHeaders[number], string>

const leadTimeHeaders = ["Period Start", "Period End", "Lead Time (in days)", "# of PRs Merged", "Merged PRs"];
type LeadTimeRow = Record<typeof leadTimeHeaders[number], string>;

export async function outputToCsv(
  {
    github,
    now,
    outputDir,
    root,
  }: {
    github: { owner: string, repo: string, },
    now: Date,
    outputDir: string,
    root: string,
  }) {
  const gh = new ReadonlyGithubClient({
    cache: await GithubDiskCache.init(path.join(root, ".deliverymetrics-data", "github", github.owner, github.repo)),
    owner: github.owner,
    repo: github.repo
  });
  console.log(await formatGithubClientStatus(gh, { mostRecent: false, unclosed: false }));

  const pulls = gh.findPulls({ sort: { key: "created_at", order: "asc" } });

  function dot() {
    const text = new TextEncoder().encode(".");
    conversion.writeAll(Deno.stdout, text);
  }

  await Promise.all([
    writeCSVToFile(
      path.join(outputDir, "all-pull-request-data.csv"),
      inspectIter(
        dot,
        githubPullsAsCsv(pulls)), { header: prHeaders.slice() }
    ),
    writeCSVToFile(
      path.join(outputDir, "pull-request-lead-times-daily.csv"),
      inspectIter(
        dot,
        prLeadTimeAsCsv(yieldPullRequestLeadTime(gh, { mode: "daily" }))), { header: leadTimeHeaders.slice() }
    ),
    writeCSVToFile(
      path.join(outputDir, "pull-request-lead-times-weekly.csv"),
      inspectIter(
        dot,
        prLeadTimeAsCsv(yieldPullRequestLeadTime(gh, { mode: "weekly" }))), { header: leadTimeHeaders.slice() }
    ),
    writeCSVToFile(
      path.join(outputDir, "pull-request-lead-times-monthly.csv"),
      inspectIter(
        dot,
        prLeadTimeAsCsv(yieldPullRequestLeadTime(gh, { mode: "monthly" }))), { header: leadTimeHeaders.slice() }
    ),
    writeCSVToFile(
      path.join(outputDir, "pull-request-lead-times-30d.csv"),
      inspectIter(
        dot,
        prLeadTimeAsCsv(
          filterIter(el => daysBetween(el.start, now) < 30, yieldPullRequestLeadTime(gh, { mode: "daily" }))
        )
      ), { header: leadTimeHeaders.slice() }
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

async function * githubPullsAsCsv(pulls: AsyncIterableIterator<GithubPull>): AsyncIterableIterator<PrRow> {
  for await(const pull of pulls) {
    yield {
      _links: JSON.stringify(pull._links),
      base: JSON.stringify({ ...pull.base, repo: undefined }),
      body: pull.body ? JSON.stringify(pull.body) : "",
      closed_at: pull.closed_at || "",
      created_at: pull.created_at,
      draft: pull.draft.toString(),
      html_url: pull.html_url,
      labels: pull.labels.map(el => el.name).join(", "),
      locked: pull.locked.toString(),
      merge_commit_sha: pull.merge_commit_sha,
      merged_at: pull.merged_at || "",
      number: pull.number.toString(),
      state: pull.state,
      title: JSON.stringify(pull.title),
      updated_at: pull.updated_at,
      was_cancelled: Boolean(pull.closed_at && pull.merged_at === null).toString(),
    };
  }
}

async function * prLeadTimeAsCsv(iter: ReturnType<typeof yieldPullRequestLeadTime>): AsyncIterableIterator<LeadTimeRow> {
  for await(const el of iter) {
    yield {
      "Period Start": el.start.toISOString(),
      "Period End": el.end.toISOString(),
      "Lead Time (in days)": toDays(el.leadTime).toPrecision(2),
      "# of PRs Merged": el.mergedPRs.length.toString(),
      "Merged PRs": el.mergedPRs.toString(),
    };
  }
}

async function * inspectIter<T>(callback: (el: T, index: number) => void, iter: AsyncIterableIterator<T>): AsyncIterableIterator<T> {
  let idx = 0;
  for await (const el of iter) {
    callback(el, idx++);
    yield el;
  }
}

async function * filterIter<T>(predicate: (value: T, index: number) => boolean, iter: AsyncGenerator<T>): AsyncGenerator<T> {
  let idx = 0;
  for await (const el of iter) {
    if (!predicate(el, idx++)) {
      continue;
    }
    yield el;
  }
}

async function writeCSVToFile(fp: string, ...args: Tail<Parameters<typeof csv.writeCSVObjects>>) {
  const f = fp;
  await fs.ensureFile(f);
  await withFileOpen(async (f) => {
    await csv.writeCSVObjects(f, ...args);
  }, f, { write: true, create: true, truncate: true });
}
