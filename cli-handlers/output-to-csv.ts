import { GithubDiskCache, GithubPull, githubPullSchema, ReadonlyGithubClient } from "../github/mod.ts";
import { yieldPullRequestLeadTime } from "../metrics/mod.ts";

import { csv, fs, path } from "../deps.ts";
import { ToTuple } from "../utils.ts";
import { withFileOpen } from "../path-and-file-utils.ts";

import { formatGithubClientStatus } from "./formatting.ts";

const primaryHeaders = ["number", "created_at", "merged_at", "updated_at", "was_cancelled",] as const;
const ignoreHeaders = [
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

const remainingHeaders = Object.keys(githubPullSchema.shape)
  .filter(n => !(primaryHeaders.slice() as string[]).includes(n))
  .filter(n => !(ignoreHeaders.slice() as string[]).includes(n)) as unknown as RemainingHeaders;
type RemainingHeaders = Readonly<ToTuple<keyof Omit<GithubPull, typeof primaryHeaders[number] | typeof ignoreHeaders[number]>>>

const headers = [...primaryHeaders, ...remainingHeaders] as const;
export type Row = Record<typeof headers[number], string>

export async function outputToCsv(
  { github, outputDir, root, }: { github: { owner: string, repo: string, }, outputDir: string, root: string }) {
  const gh = new ReadonlyGithubClient({
    cache: await GithubDiskCache.init(path.join(root, "data", "github", github.owner, github.repo)),
    owner: github.owner,
    repo: github.repo
  });
  console.log(await formatGithubClientStatus(gh, { mostRecent: false, unclosed: false }));

  const pulls = gh.findPulls({ sort: { key: "created_at", order: "asc" } });

  const outputCsv = path.join(outputDir, "all-pull-request-data.csv");
  await fs.ensureFile(outputCsv);
  await withFileOpen(async (f) => {
    await csv.writeCSVObjects(f, githubPullsAsCsv(pulls), { header: headers.slice() });
  }, outputCsv, { write: true, create: true, truncate: true });

  const dailyPRLeadTimesCsv = path.join(outputDir, "pull-request-lead-times-daily.csv");
  await fs.ensureFile(dailyPRLeadTimesCsv);
  await withFileOpen(async (f) => {
    await csv.writeCSVObjects(f, prLeadTimeAsCsv(yieldPullRequestLeadTime(gh, { mode: "daily" })), { header: PRLeadTimeHeaders.slice() });
  }, dailyPRLeadTimesCsv, { write: true, create: true, truncate: true });

  const weeklyPRLeadTimesCsv = path.join(outputDir, "pull-request-lead-times-weekly.csv");
  await fs.ensureFile(weeklyPRLeadTimesCsv);
  await withFileOpen(async (f) => {
    await csv.writeCSVObjects(f, prLeadTimeAsCsv(yieldPullRequestLeadTime(gh, { mode: "weekly" })), { header: PRLeadTimeHeaders.slice() });
  }, weeklyPRLeadTimesCsv, { write: true, create: true, truncate: true });

  const monthlyPRLeadTimesCsv = path.join(outputDir, "pull-request-lead-times-monthly.csv");
  await fs.ensureFile(monthlyPRLeadTimesCsv);
  await withFileOpen(async (f) => {
    await csv.writeCSVObjects(f, prLeadTimeAsCsv(yieldPullRequestLeadTime(gh, { mode: "monthly" })), { header: PRLeadTimeHeaders.slice() });
  }, monthlyPRLeadTimesCsv, { write: true, create: true, truncate: true });
}

async function * githubPullsAsCsv(pulls: AsyncIterableIterator<GithubPull>): AsyncIterableIterator<Row> {
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

const PRLeadTimeHeaders = ["Period Start", "Period End", "Lead Time (in days)", "# of PRs Merged", "Merged PRs"];
type PRLeadTimeRow = Record<typeof PRLeadTimeHeaders[number], string>;
async function * prLeadTimeAsCsv(iter: ReturnType<typeof yieldPullRequestLeadTime>): AsyncIterableIterator<PRLeadTimeRow> {
  for await(const el of iter) {
    yield {
      "Period Start": el.start.toISOString(),
      "Period End": el.end.toISOString(),
      "Lead Time (in days)": el.leadTimeInDays.toPrecision(2),
      "# of PRs Merged": el.mergedPRs.length.toString(),
      "Merged PRs": el.mergedPRs.toString(),
    };
  }
}
