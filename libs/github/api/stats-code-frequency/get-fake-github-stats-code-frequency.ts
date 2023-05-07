import { GithubStatsCodeFrequency } from "./github-stats-code-frequency-schema.ts"

/**
 * # Get the weekly commit activity
 *
 * Returns a weekly aggregate of the number of additions and deletions pushed to a repository.
 */
export function getFakeGithubStatsCodeFrequency(partial: GithubStatsCodeFrequency = []): GithubStatsCodeFrequency {
  const base: GithubStatsCodeFrequency = [1302998400, 1124, -435]
  return [...base, ...partial]
}
