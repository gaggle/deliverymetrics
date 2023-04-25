import { BoundGithubPullCommit, GithubPull, isMergedGithubPull, ReadonlyGithubClient } from "../github/schemas/mod.ts"

import { asyncToArray, daysBetween, filterIter, regexIntersect } from "../utils/mod.ts"

import { AbortError } from "../errors.ts"

import {
  calculatePullRequestLeadTime,
  calculatePullRequestTimeToMerge,
  calculateUnmergedPullRequestLeadTime,
  calculateUnmergedPullRequestTimeToMerge,
} from "./github-pr-engineering-metrics.ts"

type YieldPullRequestData = {
  pull: GithubPull
  commits: Array<BoundGithubPullCommit>
  leadTime?: number
  timeToMerge?: number
  cancelled: boolean
}

export async function* yieldPullRequestData(
  gh: ReadonlyGithubClient,
  { maxDays, includeBranches, excludeBranches, includeLabels, excludeLabels, includeCancelled, signal }: Partial<
    {
      maxDays: number
      includeBranches: Array<string | RegExp>
      excludeBranches: Array<string | RegExp>
      includeLabels: Array<string | RegExp>
      excludeLabels: Array<string | RegExp>
      includeCancelled: boolean
      signal: AbortSignal
    }
  > = {},
): AsyncGenerator<YieldPullRequestData> {
  const latestSync = await gh.findLatestSync({ type: "pull" })
  if (!latestSync) return

  for await (
    const pull of filterIter((pull) => {
      if (signal?.aborted) {
        throw new AbortError()
      }

      if (pull.draft === true) return false

      if (daysBetween(new Date(pull.created_at), new Date(latestSync.updatedAt!)) > (maxDays || Infinity)) {
        return false
      }

      if (
        excludeBranches !== undefined &&
        regexIntersect([pull.head.ref], excludeBranches).length > 0
      ) {
        return false
      }

      if (
        includeBranches !== undefined &&
        regexIntersect([pull.head.ref], includeBranches).length === 0
      ) {
        return false
      }

      if (
        excludeLabels !== undefined &&
        regexIntersect(pull.labels.map((lbl) => lbl.name), excludeLabels).length > 0
      ) {
        return false
      }

      if (
        includeLabels !== undefined &&
        regexIntersect(pull.labels.map((lbl) => lbl.name), includeLabels).length === 0
      ) {
        return false
      }

      return true
    }, gh.findPulls({ sort: { key: "created_at", order: "asc" } }))
  ) {
    const commits = await asyncToArray(
      gh.findPullCommits({ pr: pull.number, sort: { key: "commit.author", order: "asc" } }),
    )

    const cancelled = Boolean(pull.closed_at && pull.merged_at === null)
    if (cancelled && includeCancelled === false) {
      continue
    }

    yield {
      pull,
      commits,
      leadTime: isMergedGithubPull(pull)
        ? calculatePullRequestLeadTime(pull)
        : calculateUnmergedPullRequestLeadTime(pull, latestSync.createdAt),
      timeToMerge: isMergedGithubPull(pull)
        ? calculatePullRequestTimeToMerge(pull, commits[0])
        : calculateUnmergedPullRequestTimeToMerge(commits[0], latestSync.createdAt),
      cancelled,
    }
  }
}
