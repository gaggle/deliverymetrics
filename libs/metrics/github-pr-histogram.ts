import { debug } from "std:log"

import {
  AbortError,
  assertUnreachable,
  dayEnd,
  daysBetween,
  dayStart,
  filterIter,
  monthEnd,
  monthStart,
  regexIntersect,
  weekEnd,
  weekStart,
} from "../../utils/mod.ts"

import { GithubPull, MergedGithubPull } from "../github/api/pulls/mod.ts"
import { ReadonlyGithubClient } from "../github/mod.ts"

import { calculatePullRequestLeadTime, calculatePullRequestTimeToMerge } from "./github-pr-engineering-metrics.ts"

type PullRequestLeadTime = {
  start: Date
  end: Date
  leadTime: number
  timeToMerge: number | undefined
  mergedPRs: Array<number>
}

export async function* yieldPullRequestHistogram(
  gh: ReadonlyGithubClient,
  { mode, maxDays, includeLabels, excludeLabels, excludeBranches, includeBranches, signal }: {
    mode: "daily" | "weekly" | "monthly"
    maxDays?: number
    includeBranches?: Array<string | RegExp>
    excludeBranches?: Array<string | RegExp>
    includeLabels?: Array<string | RegExp>
    excludeLabels?: Array<string | RegExp>
    signal?: AbortSignal
  },
): AsyncGenerator<PullRequestLeadTime> {
  let leadTimes: Array<{ leadTime: number; timeToMerge?: number; number: GithubPull["number"] }> = []
  let prevPeriod: Date | undefined

  let periodConf: {
    ceil: (d: Date) => Date
    floor: (d: Date) => Date
  }
  switch (mode) {
    case "daily":
      periodConf = {
        ceil: dayEnd,
        floor: dayStart,
      }
      break
    case "weekly":
      periodConf = {
        ceil: weekEnd,
        floor: weekStart,
      }
      break
    case "monthly":
      periodConf = {
        ceil: monthEnd,
        floor: monthStart,
      }
      break
    default:
      assertUnreachable(mode)
  }

  function getYieldValue(): PullRequestLeadTime {
    const leadTimeSum = leadTimes.reduce((acc, val) => acc + val.leadTime, 0)

    let timeToMerge: number | undefined = undefined
    if (!leadTimes.filter((el) => el.timeToMerge === undefined).length) {
      // ↑ If any of this period's PRs failed to calculate Time to Merge then the metric isn't useful for that period
      const timeToMergeSum = leadTimes.reduce((acc, val) => acc + val.timeToMerge!, 0)
      timeToMerge = timeToMergeSum / leadTimes.length
    }
    return {
      start: prevPeriod!,
      end: periodConf.ceil(prevPeriod!),
      leadTime: leadTimeSum / leadTimes.length,
      timeToMerge,
      mergedPRs: leadTimes.map((el) => el.number),
    }
  }

  const latestSync = await gh.findLatestSync({ type: "pull" })
  if (!latestSync) return

  for await (
    const pull of filterIter(
      (pull) => {
        if (!pull.merged_at) return false

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
      },
      gh.findPulls({ sort: { key: "merged_at", order: "asc" } }),
    ) as AsyncGenerator<MergedGithubPull>
  ) {
    if (signal?.aborted) {
      throw new AbortError()
    }

    const currentPeriod = periodConf.floor(new Date(pull.merged_at))

    if (prevPeriod && prevPeriod.getTime() !== currentPeriod.getTime()) {
      // New period threshold, yield what we got and reset
      yield getYieldValue()
      leadTimes = []
    }
    prevPeriod = currentPeriod

    const commit = await gh.findEarliestPullCommit({ pr: pull.number })
    const timeToMerge = commit ? calculatePullRequestTimeToMerge(pull, commit) : undefined
    if (!timeToMerge) {
      debug(
        commit
          ? `Failed to calculate Time to Merge for pull ${pull.number}`
          : `No commits found for pull ${pull.number}`,
      )
    }

    leadTimes.push({
      leadTime: calculatePullRequestLeadTime(pull),
      timeToMerge,
      number: pull.number,
    })
  }

  if (prevPeriod) {
    yield getYieldValue()
  }
}
