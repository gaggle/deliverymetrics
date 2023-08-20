import { dbCodeFrequencySchema } from "../../libs/github/api/stats-code-frequency/mod.ts"
import { githubStatsCommitActivitySchema } from "../../libs/github/api/stats-commit-activity/mod.ts"
import { githubStatsContributorSchema } from "../../libs/github/api/stats-contributors/mod.ts"
import { dbPunchCardSchema } from "../../libs/github/api/stats-punch-card/mod.ts"
import {
  yieldStatsCodeFrequency,
  yieldStatsCommitActivity,
  yieldStatsContributors,
  yieldStatsParticipation,
  yieldStatsPunchCard,
} from "../../libs/metrics/mod.ts"

import { extractZodSchemaKeys, flattenObject, stringifyObject } from "../../utils/mod.ts"

const extraStatsCodeFrequencyHeaders = [] as const
export const githubStatsCodeFrequencyHeaders = [
  ...extraStatsCodeFrequencyHeaders,
  ...Object.keys(flattenObject(extractZodSchemaKeys(dbCodeFrequencySchema))).sort(),
]
export type GithubStatsCodeFrequencyRow = Record<typeof githubStatsCodeFrequencyHeaders[number], string>

export async function* githubStatsCodeFrequenciesAsCsv(
  iter: ReturnType<typeof yieldStatsCodeFrequency>,
): AsyncGenerator<GithubStatsCodeFrequencyRow> {
  for await (const el of iter) {
    yield {
      ...stringifyObject(flattenObject(el.codeFrequency), { stringifyUndefined: true }),
    }
  }
}

const extraStatsCommitActivityHeaders = [
  "Week Date",
  "Sunday Commits",
  "Monday Commits",
  "Tuesday Commits",
  "Wednesday Commits",
  "Thursday Commits",
  "Friday Commits",
  "Saturday Commits",
] as const
export const githubStatsCommitActivityHeaders = [
  ...extraStatsCommitActivityHeaders,
  ...Object.keys(flattenObject(extractZodSchemaKeys(githubStatsCommitActivitySchema))).sort(),
]
export type GithubStatsCommitActivityRow = Record<typeof githubStatsCommitActivityHeaders[number], string>

export async function* githubStatsCommitActivityAsCsv(
  iter: ReturnType<typeof yieldStatsCommitActivity>,
): AsyncGenerator<GithubStatsCommitActivityRow> {
  for await (const el of iter) {
    yield {
      "Week Date": el.weekStr,
      "Sunday Commits": el.sunday.toString(),
      "Monday Commits": el.monday.toString(),
      "Tuesday Commits": el.tuesday.toString(),
      "Wednesday Commits": el.wednesday.toString(),
      "Thursday Commits": el.thursday.toString(),
      "Friday Commits": el.friday.toString(),
      "Saturday Commits": el.saturday.toString(),
      ...stringifyObject(flattenObject(el.commitActivity), { stringifyUndefined: true }),
    }
  }
}

const extraStatsContributorsHeaders = [] as const
export const githubStatsContributorsHeaders = [
  ...extraStatsContributorsHeaders,
  ...Object.keys(flattenObject(extractZodSchemaKeys(githubStatsContributorSchema))).sort(),
]
export type GithubStatsContributorsRow = Record<typeof githubStatsContributorsHeaders[number], string>

export async function* githubStatsContributorsAsCsv(
  iter: ReturnType<typeof yieldStatsContributors>,
): AsyncGenerator<GithubStatsContributorsRow> {
  for await (const el of iter) {
    yield {
      ...stringifyObject(flattenObject(el.contributors), { stringifyUndefined: true }),
    }
  }
}

const extraStatsParticipationHeaders = [
  "Weeks Ago",
  "Week Start",
  "Week End",
  "Total Commits",
  "Owner Commits",
  "Non Owner Commits",
] as const
export const githubStatsParticipationHeaders = [
  ...extraStatsParticipationHeaders,
]
export type GithubStatsParticipationRow = Record<typeof githubStatsParticipationHeaders[number], string>

export async function* githubStatsParticipationAsCsv(
  iter: ReturnType<typeof yieldStatsParticipation>,
): AsyncGenerator<GithubStatsParticipationRow> {
  for await (const el of iter) {
    for (const [idx, totalCommits] of el.totalCommitsPerWeek.entries()) {
      const ownerCommits = el.ownerCommitsPerWeek[idx]
      const nonOwnerCommits = el.nonOwnerCommitsPerWeek[idx]
      const dates = el.weekDates[idx]
      yield {
        "Week Start": dates.start.toISOString(),
        "Week End": dates.end.toISOString(),
        "Weeks Ago": idx.toString(),
        "Total Commits": totalCommits.toString(),
        "Owner Commits": ownerCommits.toString(),
        "Non Owner Commits": nonOwnerCommits.toString(),
      }
    }
  }
}

const extraStatsPunchCardHeaders = ["Day Name"] as const
export const githubStatsPunchCardHeaders = [
  ...extraStatsPunchCardHeaders,
  ...Object.keys(flattenObject(extractZodSchemaKeys(dbPunchCardSchema))).sort(),
]
export type GithubStatsPunchCardRow = Record<typeof githubStatsPunchCardHeaders[number], string>

export async function* githubStatsPunchCardAsCsv(
  iter: ReturnType<typeof yieldStatsPunchCard>,
): AsyncGenerator<GithubStatsPunchCardRow> {
  for await (const el of iter) {
    yield {
      "Day Name": el.dayStr,
      ...stringifyObject(flattenObject(el.punchCard), { stringifyUndefined: true }),
    }
  }
}
