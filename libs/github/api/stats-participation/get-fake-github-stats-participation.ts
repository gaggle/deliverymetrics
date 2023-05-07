import { deepMerge } from "std:deep-merge"

import { DeepPartial } from "../../../types.ts"

import { GithubStatsParticipation } from "./github-stats-participation-schema.ts"

/**
 * # Get the weekly commit count
 * Returns the total commit counts for the owner and total commit counts in all.
 * All is everyone combined, including the owner in the last 52 weeks.
 * If you'd like to get the commit counts for non-owners, you can subtract owner from all.
 *
 * The array order is oldest week (index 0) to most recent week.
 *
 * The most recent week is seven days ago at UTC midnight to today at UTC midnight.
 */
export function getFakeGithubStatsParticipation(
  partial: DeepPartial<GithubStatsParticipation> = {},
): GithubStatsParticipation {
  const base: GithubStatsParticipation = {
    "all": [11, 21, 15, 2, 8, 1, 8, 23, 17, 21, 11, 10, 33, 91, 38, 34, 22, 23, 32, 3, 43, 87, 71, 18, 13, 5, 13, 16, 66, 27, 12, 45, 110, 117, 13, 8, 18, 9, 19, 26, 39, 12, 20, 31, 46, 91, 45, 10, 24, 9, 29, 7],
    "owner": [3, 2, 3, 0, 2, 0, 5, 14, 7, 9, 1, 5, 0, 48, 19, 2, 0, 1, 10, 2, 23, 40, 35, 8, 8, 2, 10, 6, 30, 0, 2, 9, 53, 104, 3, 3, 10, 4, 7, 11, 21, 4, 4, 22, 26, 63, 11, 2, 14, 1, 10, 3]
  }
  return deepMerge(base, partial as GithubStatsParticipation)
}
