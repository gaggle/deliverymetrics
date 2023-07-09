import { DBCodeFrequency } from "../github/api/stats-code-frequency/mod.ts"
import { DBPunchCard } from "../github/api/stats-punch-card/mod.ts"
import { GithubStatsCommitActivity } from "../github/api/stats-commit-activity/mod.ts"
import { GithubStatsContributor } from "../github/api/stats-contributors/mod.ts"

import { ReadonlyGithubClient } from "../github/mod.ts"
import { daysBetween } from "../utils/mod.ts"

import { AbortError } from "../errors.ts"

type YieldStatsCodeFrequencyData = {
  codeFrequency: DBCodeFrequency
}

export async function* yieldStatsCodeFrequency(
  gh: ReadonlyGithubClient,
  { maxDays, signal }: Partial<{ maxDays: number; signal: AbortSignal }> = {},
): AsyncGenerator<YieldStatsCodeFrequencyData> {
  const latestSync = await gh.findLatestSync({ type: "stats-code-frequency" })
  if (!latestSync) return

  for await (const el of gh.findStatsCodeFrequencies()) {
    if (signal?.aborted) {
      throw new AbortError()
    }

    if (daysBetween(new Date(el.timeStr), new Date(latestSync.updatedAt!)) > (maxDays || Infinity)) {
      continue
    }

    yield {
      codeFrequency: el,
    }
  }
}

type YieldStatsCommitActivityData = {
  commitActivity: GithubStatsCommitActivity
}

export async function* yieldStatsCommitActivity(
  gh: ReadonlyGithubClient,
  { signal }: Partial<{ signal: AbortSignal }> = {},
): AsyncGenerator<YieldStatsCommitActivityData> {
  const latestSync = await gh.findLatestSync({ type: "stats-commit-activity" })
  if (!latestSync) return

  for await (const el of gh.findStatsCommitActivities()) {
    if (signal?.aborted) {
      throw new AbortError()
    }

    yield {
      commitActivity: el,
    }
  }
}

type YieldStatsContributorsData = {
  contributors: GithubStatsContributor
}

export async function* yieldStatsContributors(
  gh: ReadonlyGithubClient,
  { maxDays, signal }: Partial<{ maxDays: number; signal: AbortSignal }> = {},
): AsyncGenerator<YieldStatsContributorsData> {
  const latestSync = await gh.findLatestSync({ type: "stats-contributors" })
  if (!latestSync) return

  for await (const el of gh.findStatsContributors()) {
    if (signal?.aborted) {
      throw new AbortError()
    }

    el.weeks = el.weeks.filter((hash) => {
      if (!hash.w) return true
      return daysBetween(new Date(hash.w * 1000), new Date(latestSync.updatedAt!)) <= (maxDays || Infinity)
    })
    if (el.weeks.length === 0) continue
    el.total = el.weeks.reduce((acc, val) => acc + (val.c || 0), 0)

    yield {
      contributors: el,
    }
  }
}

type YieldStatsParticipationData = {
  totalCommitsPerWeek: number[]
  ownerCommitsPerWeek: number[]
  nonOwnerCommitsPerWeek: number[]
  weekDates: Array<{ start: Date; end: Date }>
}

export async function* yieldStatsParticipation(
  gh: ReadonlyGithubClient,
  { signal }: Partial<{ signal: AbortSignal }> = {},
): AsyncGenerator<YieldStatsParticipationData> {
  const latestSync = await gh.findLatestSync({ type: "stats-participation" })
  if (!latestSync) return

  for await (const el of gh.findStatsParticipants()) {
    if (signal?.aborted) {
      throw new AbortError()
    }

    // The most recent week is seven days ago at UTC midnight to today at UTC midnight.
    const mostRecentWeekEnd = new Date(latestSync.updatedAt!)
    mostRecentWeekEnd.setUTCHours(0, 0, 0, 0)

    const mostRecentWeekStart = new Date(mostRecentWeekEnd)
    mostRecentWeekStart.setUTCDate(mostRecentWeekStart.getUTCDate() - 7)

    const weekDates = el.all.map((_, idx) => {
      const daysAgo = 7 * idx

      const weekEnd = new Date(mostRecentWeekEnd)
      weekEnd.setUTCDate(weekEnd.getUTCDate() - daysAgo)

      const weekStart = new Date(mostRecentWeekStart)
      weekStart.setUTCDate(weekStart.getUTCDate() - daysAgo)

      return { start: weekStart, end: weekEnd }
    })

    yield {
      totalCommitsPerWeek: el.all,
      ownerCommitsPerWeek: el.owner,
      nonOwnerCommitsPerWeek: el.all.map((total, index) => total - el.owner[index]),
      weekDates,
    }
  }
}

type YieldStatsPunchCardData = {
  punchCard: DBPunchCard
  dayStr: string
}

export async function* yieldStatsPunchCard(
  gh: ReadonlyGithubClient,
  { signal }: Partial<{ signal: AbortSignal }> = {},
): AsyncGenerator<YieldStatsPunchCardData> {
  const latestSync = await gh.findLatestSync({ type: "stats-punch-card" })
  if (!latestSync) return

  for await (const el of gh.findStatsPunchCards()) {
    if (signal?.aborted) {
      throw new AbortError()
    }

    yield {
      punchCard: el,
      dayStr: dayIdxToStr[el.day],
    }
  }
}

const dayIdxToStr = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
}
