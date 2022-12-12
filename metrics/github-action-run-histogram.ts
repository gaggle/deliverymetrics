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
import { ActionRun, ActionWorkflow, ReadonlyGithubClient } from "../github/mod.ts";

import { assertUnreachable } from "../utils.ts";

import { dateEnd, dayStart, monthEnd, monthStart, nextDate, weekEnd, weekStart } from "./date-utils.ts";

type ActionRunHistogram = {
  start: Date;
  end: Date;
  count: number;
  ids: Array<number>;
  htmlUrls: Array<string>;
};

export async function* yieldActionRunHistogram(
  gh: ReadonlyGithubClient,
  { mode, workflow }: { mode: "daily" | "weekly" | "monthly"; workflow: { path: ActionWorkflow["path"] } },
): AsyncGenerator<ActionRunHistogram> {
  let periodConf: {
    ceil: (d: Date) => Date;
    floor: (d: Date) => Date;
  };
  switch (mode) {
    case "daily":
      periodConf = {
        ceil: dateEnd,
        floor: dayStart,
      };
      break;
    case "weekly":
      periodConf = {
        ceil: weekEnd,
        floor: weekStart,
      };
      break;
    case "monthly":
      periodConf = {
        ceil: monthEnd,
        floor: monthStart,
      };
      break;
    default:
      assertUnreachable(mode);
  }

  let accumulator: Array<ActionRun> = [];
  let prevPeriod: Date | undefined;

  function getYieldValue(): ActionRunHistogram {
    return {
      start: prevPeriod!,
      end: periodConf.ceil(prevPeriod!),
      count: accumulator.length,
      ids: accumulator.map((el) => el.id),
      htmlUrls: accumulator.map((el) => el.html_url),
    };
  }

  for await (
    const run of gh.findActionRuns({
      branch: "main",
      conclusion: "success",
      path: workflow.path,
      sort: { key: "updated_at", order: "asc" },
    })
  ) {
    const currentPeriod = periodConf.floor(new Date(run.updated_at));

    if (prevPeriod && prevPeriod.getTime() !== currentPeriod.getTime()) {
      // New period threshold, yield what we got and reset
      yield getYieldValue();
      accumulator = [];
    }
    prevPeriod = currentPeriod;

    accumulator.push(run);
  }

  if (prevPeriod) {
    yield getYieldValue();
  }
}
