import { GithubClient, GithubPull } from "../github/mod.ts";

import { assertUnreachable } from "../utils.ts";

type PullRequestLeadTime = { start: Date, end: Date, leadTimeInDays: number, mergedPRs: Array<number> }

export async function * yieldPullRequestLeadTime(gh: GithubClient, { mode }: { mode: "daily" | "weekly" | "monthly" }): AsyncGenerator<PullRequestLeadTime> {
  let leadTimes: Array<{ leadTime: number, number: GithubPull["number"] }> = [];
  let prevPeriod: Date | undefined;

  let periodConf: {
    ceil: (d: Date) => Date,
    floor: (d: Date) => Date,
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
      leadTimeInDays: toDays(leadTimeSum) / leadTimes.length,
      mergedPRs: leadTimes.map(el => el.number)
    };
  }

  for await(const pull of gh.findPulls({ sort: { key: "merged_at", order: "asc" } })) {
    if (!pull.merged_at) {
      continue;
    }
    const currentPeriod = periodConf.floor(new Date(pull.merged_at));

    if (prevPeriod && prevPeriod.getTime() !== currentPeriod.getTime()) {
      // New period threshold, yield what we got and reset
      yield getYieldValue();
      leadTimes = [];
    }
    prevPeriod = currentPeriod;

    leadTimes.push({
      leadTime: nextDate(pull.merged_at).getTime() - dayStart(pull.created_at).getTime(),
      number: pull.number,
    });
  }

  if (prevPeriod) {
    yield getYieldValue();
  }
}

function toDays(duration: number): number {
  return Math.ceil(duration / (1000 /*ms*/ * 60 /*s*/ * 60 /*m*/ * 24 /*hr*/));
}

function dayStart(...args: ConstructorParameters<typeof Date>): Date {
  const d = new Date(...args);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function dateEnd(...args: ConstructorParameters<typeof Date>): Date {
  const d = new Date(...args);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function nextDate(...args: ConstructorParameters<typeof Date>): Date {
  const d = dayStart(...args);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function weekStart(...args: ConstructorParameters<typeof Date>): Date {
  const d = dayStart(...args);
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() - 1));
  return d;
}

function weekEnd(...args: ConstructorParameters<typeof Date>): Date {
  const d = weekStart(...args);
  d.setUTCDate(d.getUTCDate() + 6);
  return dateEnd(d);
}

function monthStart(...args: ConstructorParameters<typeof Date>): Date {
  const d = dayStart(...args);
  d.setUTCDate(1);
  return d;
}

function monthEnd(...args: ConstructorParameters<typeof Date>): Date {
  const d = new Date(...args);
  return dateEnd(new Date(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}
