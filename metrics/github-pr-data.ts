import { GithubPull, isMergedGithubPull, ReadonlyGithubClient } from "../github/types/mod.ts";

import { asyncToArray, filterIter, regexIntersect } from "../utils.ts";

import { calculatePullRequestLeadTime, calculatePullRequestTimeToMerge } from "./github-pr-engineering-metrics.ts";
import { daysBetween } from "./date-utils.ts";

type YieldPullRequestData = {
  pull: GithubPull;
  commits: Array<{ author_name?: string; committer_name?: string }>;
  leadTime?: number;
  timeToMerge?: number;
};

export async function* yieldPullRequestData(
  gh: ReadonlyGithubClient,
  { maxDays, includeBranches, excludeBranches, includeLabels, excludeLabels }: Partial<
    {
      maxDays: number;
      includeBranches?: Array<string | RegExp>;
      excludeBranches?: Array<string | RegExp>;
      includeLabels?: Array<string | RegExp>;
      excludeLabels?: Array<string | RegExp>;
    }
  > = {},
): AsyncGenerator<YieldPullRequestData> {
  const latestSync = await gh.findLatestSync();
  if (!latestSync) return;

  for await (
    const pull of filterIter((pull) => {
      if (pull.draft === true) return false;

      if (daysBetween(new Date(pull.created_at), new Date(latestSync.updatedAt!)) > (maxDays || Infinity)) {
        return false;
      }

      if (
        excludeBranches !== undefined &&
        regexIntersect([pull.head.ref], excludeBranches).length > 0
      ) {
        return false;
      }

      if (
        includeBranches !== undefined &&
        regexIntersect([pull.head.ref], includeBranches).length === 0
      ) {
        return false;
      }

      if (
        excludeLabels !== undefined &&
        regexIntersect(pull.labels.map((lbl) => lbl.name), excludeLabels).length > 0
      ) {
        return false;
      }

      if (
        includeLabels !== undefined &&
        regexIntersect(pull.labels.map((lbl) => lbl.name), includeLabels).length === 0
      ) {
        return false;
      }

      return true;
    }, gh.findPulls({ sort: { key: "created_at", order: "asc" } }))
  ) {
    const commits = await asyncToArray(
      gh.findPullCommits({ pr: pull.number, sort: { key: "commit.author", order: "asc" } }),
    );
    yield {
      pull,
      commits: commits.map((el) => ({
        author_name: el.commit?.author?.name,
        committer_name: el.commit?.committer?.name,
      })),
      leadTime: isMergedGithubPull(pull) ? calculatePullRequestLeadTime(pull) : undefined,
      timeToMerge: isMergedGithubPull(pull) ? calculatePullRequestTimeToMerge(pull, commits[0]) : undefined,
    };
  }
}
