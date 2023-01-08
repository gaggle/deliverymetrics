import { GithubPull, ReadonlyGithubClient } from "../github/types/mod.ts";

import { asyncToArray, filterIter } from "../utils.ts";

import { daysBetween } from "./date-utils.ts";

type YieldPullRequestData = GithubPull & { commits: Array<{ author_name?: string; committer_name?: string }> };

export async function* yieldPullRequestData(
  gh: ReadonlyGithubClient,
  { maxDays }: Partial<{ maxDays: number }> = {},
): AsyncGenerator<YieldPullRequestData> {
  const latestSync = await gh.findLatestSync();
  if (!latestSync) return;

  for await (
    const el of filterIter(
      (el) =>
        el.draft === false &&
        daysBetween(new Date(el.created_at), new Date(latestSync.updatedAt!)) < (maxDays || Infinity),
      gh.findPulls({ sort: { key: "created_at", order: "asc" } }),
    )
  ) {
    const commits = await asyncToArray(gh.findPullCommits({ pr: el.number }));
    yield {
      ...el,
      commits: commits.map((el) => ({
        author_name: el.commit?.author?.name,
        committer_name: el.commit?.committer?.name,
      })),
    };
  }
}
