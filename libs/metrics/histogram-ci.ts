/**
 * Action Run Histogram
 *
 * The action run histogram shows how many times a workflow has been run per time unit.
 *
 * To find this number, runs for a single workflow is grouped together by time units.
 *
 * This metric is useful to answer how often deployments are made (by looking at the workflow that handles deploying),
 * or finding instabilities or bad work-practices that cause a workflow to fail.
 */
import { groupBy } from "std:group-by"

import {
  AbortError,
  assertUnreachable,
  dayEnd,
  daysBetween,
  dayStart,
  filterIter,
  monthEnd,
  monthStart,
  weekEnd,
  weekStart,
} from "../../utils/mod.ts"

import { GithubActionRun } from "../github/api/action-run/mod.ts"
import { GithubActionWorkflow } from "../github/api/action-workflows/mod.ts"
import { ReadonlyGithubClient } from "../github/mod.ts"

type ActionRunHistogram =
  & {
    branches: Array<string>
    conclusions: Array<string>
    count: number
    end: Date
    htmlUrls: Array<string>
    ids: Array<number>
    paths: Array<string>
    start: Date
  }
  & Record<`${string}Count`, number>
  & Record<`${string}Ids`, Array<number>>

export async function* yieldContinuousIntegrationHistogram(
  gh: ReadonlyGithubClient,
  { branch, conclusion, maxDays, mode, workflow, signal }: {
    mode: "daily" | "weekly" | "monthly"
    maxDays?: number
    branch?: string
    conclusion?: string | RegExp
    workflow?: { path: GithubActionWorkflow["path"] }
    signal?: AbortSignal
  },
): AsyncGenerator<ActionRunHistogram> {
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

  let accumulator: Array<GithubActionRun> = []
  let prevPeriod: Date | undefined

  function getYieldValue(): ActionRunHistogram {
    const perConclusion = groupBy(accumulator, (el) => el.conclusion!)
    return {
      branches: accumulator
        .map((el) => el.head_branch)
        .filter((v, i, a) => a.indexOf(v) === i) // Make unique
        .sort() as Array<string>,
      conclusions: accumulator
        .map((el) => el.conclusion)
        .filter((el) => !!el) // Remove nulls
        .filter((v, i, a) => a.indexOf(v) === i) // Make unique
        .sort() as Array<string>,
      count: accumulator.length,
      end: periodConf.ceil(prevPeriod!),
      htmlUrls: accumulator.map((el) => el.html_url),
      ids: accumulator.map((el) => el.id),
      paths: accumulator
        .map((el) => el.path)
        .filter((v, i, a) => a.indexOf(v) === i) // Make unique
        .sort() as Array<string>,
      start: prevPeriod!,
      ...Object.entries(perConclusion).reduce((acc, [conclusion, histograms]) =>
        histograms
          ? {
            ...acc,
            [`${conclusion}Count`]: histograms.length,
            [`${conclusion}Ids`]: histograms.map((el) => el.id),
          }
          : acc, {}),
    }
  }

  const latestSync = await gh.findLatestSync({ type: "action-run" })
  if (!latestSync) return
  for await (
    const run of filterIter(
      (run) => {
        if (daysBetween(new Date(run.created_at), new Date(latestSync.updatedAt!)) > (maxDays || Infinity)) {
          return false
        }

        return true
      },
      gh.findActionRuns({
        branch,
        conclusion,
        path: workflow?.path,
        sort: { key: "updated_at", order: "asc" },
      }),
    )
  ) {
    if (signal?.aborted) {
      throw new AbortError()
    }

    const currentPeriod = periodConf.floor(new Date(run.updated_at))

    if (prevPeriod && prevPeriod.getTime() !== currentPeriod.getTime()) {
      // New period threshold, yield what we got and reset
      yield getYieldValue()
      accumulator = []
    }
    prevPeriod = currentPeriod

    accumulator.push(run)
  }

  if (prevPeriod) {
    yield getYieldValue()
  }
}
