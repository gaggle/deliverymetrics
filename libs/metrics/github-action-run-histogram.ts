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
import { GithubActionRun } from "../github/api/action-run/mod.ts"
import { GithubActionWorkflow } from "../github/api/action-workflows/mod.ts"

import { assertUnreachable, dayEnd, dayStart, monthEnd, monthStart, weekEnd, weekStart } from "../utils/mod.ts"
import { ReadonlyGithubClient } from "../github/mod.ts"

import { AbortError } from "../../utils/errors.ts"

type ActionRunHistogram = {
  start: Date
  end: Date
  count: number
  ids: Array<number>
  htmlUrls: Array<string>
  conclusions: Array<string>
}

export async function* yieldActionRunHistogram(
  gh: ReadonlyGithubClient,
  { branch, conclusion, mode, workflow, signal }: {
    branch: string
    conclusion: string | RegExp
    mode: "daily" | "weekly" | "monthly"
    workflow: { path: GithubActionWorkflow["path"] }
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
    return {
      start: prevPeriod!,
      end: periodConf.ceil(prevPeriod!),
      count: accumulator.length,
      ids: accumulator.map((el) => el.id),
      htmlUrls: accumulator.map((el) => el.html_url),
      conclusions: accumulator
        .map((el) => el.conclusion)
        .filter((el) => !!el) // Remove nulls
        .filter((v, i, a) => a.indexOf(v) === i) // Make unique
        .sort() as Array<string>,
    }
  }

  for await (
    const run of gh.findActionRuns({
      branch,
      conclusion,
      path: workflow.path,
      sort: { key: "updated_at", order: "asc" },
    })
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
