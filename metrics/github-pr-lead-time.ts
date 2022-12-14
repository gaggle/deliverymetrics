/**
 * Pull Request Lead Time
 *
 * The lead-time metric gives you an idea of how many times (usually in days)
 * pull requests take to be merged or closed.
 *
 * To find this number, you need to track every pull request.
 * Save the date and time for each pull request when opened,
 * and then, when it’s merged, save it too.
 *
 * This metric is especially useful for raising questions and start investigations before it’s too late.
 * A good practice is to measure this number over time so that you can spot trends and behaviors more pragmatically.
 *
 * https://sourcelevel.io/blog/5-metrics-engineering-managers-can-extract-from-pull-requests
 */
import { GithubPull, MergedGithubPull, ReadonlyGithubClient } from "../github/mod.ts";

import { assertUnreachable, filterIter, regexIntersect } from "../utils.ts";

import { dateEnd, daysBetween, dayStart, monthEnd, monthStart, nextDate, weekEnd, weekStart } from "./date-utils.ts";

type PullRequestLeadTime = {
  start: Date;
  end: Date;
  leadTime: number;
  mergedPRs: Array<number>;
};

export async function* yieldPullRequestLeadTime(
  gh: ReadonlyGithubClient,
  { mode, maxDays, includeLabels, excludeLabels, excludeBranches, includeBranches }: {
    mode: "daily" | "weekly" | "monthly";
    maxDays?: number;
    includeBranches?: Array<string | RegExp>;
    excludeBranches?: Array<string | RegExp>;
    includeLabels?: Array<string | RegExp>;
    excludeLabels?: Array<string | RegExp>;
  },
): AsyncGenerator<PullRequestLeadTime> {
  let leadTimes: Array<{ leadTime: number; number: GithubPull["number"] }> = [];
  let prevPeriod: Date | undefined;

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

  function getYieldValue(): PullRequestLeadTime {
    const leadTimeSum = leadTimes.reduce((acc, val) => acc + val.leadTime, 0);
    return {
      start: prevPeriod!,
      end: periodConf.ceil(prevPeriod!),
      leadTime: leadTimeSum / leadTimes.length,
      mergedPRs: leadTimes.map((el) => el.number),
    };
  }

  const latestSync = await gh.findLatestSync();
  if (!latestSync) return;

  for await (
    const pull of filterIter(
      (pull) => {
        if (!pull.merged_at) return false;

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
      },
      gh.findPulls({ sort: { key: "merged_at", order: "asc" } }),
    ) as AsyncGenerator<MergedGithubPull>
  ) {
    const currentPeriod = periodConf.floor(new Date(pull.merged_at));

    if (prevPeriod && prevPeriod.getTime() !== currentPeriod.getTime()) {
      // New period threshold, yield what we got and reset
      yield getYieldValue();
      leadTimes = [];
    }
    prevPeriod = currentPeriod;

    leadTimes.push({
      leadTime: calculatePullRequestLeadTime(pull),
      number: pull.number,
    });
  }

  if (prevPeriod) {
    yield getYieldValue();
  }
}

export function calculatePullRequestLeadTime(pull: MergedGithubPull): number {
  return nextDate(pull.merged_at).getTime() - dayStart(pull.created_at).getTime();
}
