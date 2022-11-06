import { GithubClient } from "../github/mod.ts";

type DailyPullRequestLeadTime = { day: string, leadTimeInDays: number, numOfPRsMerged: number }

export async function * yieldDailyPullRequestLeadTime(gh: GithubClient): AsyncGenerator<DailyPullRequestLeadTime> {
  let leadTimes: Array<number> = [];
  let prevDay: Date | undefined;

  function getYieldValue() {
    const leadTimeSum = leadTimes.reduce((prev, val) => prev + val, 0);
    return {
      day: prevDay!.toISOString(),
      leadTimeInDays: toDays(leadTimeSum) / leadTimes.length,
      numOfPRsMerged: leadTimes.length
    };
  }

  for await(const pull of gh.findPulls({ sort: { key: "merged_at", order: "asc" } })) {
    if (!pull.merged_at) {
      continue;
    }
    const currentDay = flooredDate(pull.merged_at);

    if (prevDay && prevDay.getTime() !== currentDay.getTime()) {
      // New day threshold, yield what we got and reset
      yield getYieldValue();
      leadTimes = [];
    }
    prevDay = currentDay;

    leadTimes.push(ceilDate(pull.merged_at).getTime() - flooredDate(pull.created_at).getTime());
  }

  if (prevDay) {
    yield getYieldValue();
  }
}

function toDays(duration: number): number {
  return Math.ceil(duration / (1000 /*ms*/ * 60 /*s*/ * 60 /*m*/ * 24 /*hr*/));
}

function flooredDate(...args: ConstructorParameters<typeof Date>): Date {
  const d = new Date(...args);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function ceilDate(...args: ConstructorParameters<typeof Date>): Date {
  const d = flooredDate(...args);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
