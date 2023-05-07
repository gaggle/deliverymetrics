import { GithubStatsPunchCard } from "./github-stats-punch-card-schema.ts"

/**
 * # Get the hourly commit count for each day
 *
 * Each array contains the day number, hour number, and number of commits:
 *
 * * 0-6: Sunday - Saturday
 * * 0-23: Hour of day
 * * Number of commits
 * For example, `[2, 14, 25]` indicates that there were 25 total commits, during the 2:00pm hour on Tuesdays.
 * All times are based on the time zone of individual commits.
 */
export function getFakeGithubStatsPunchCard(partial: GithubStatsPunchCard = []): GithubStatsPunchCard {
  const base: GithubStatsPunchCard = [2, 14, 25]
  return [...base, ...partial]
}
