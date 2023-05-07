import { deepMerge } from "std:deep-merge"

import { DeepPartial } from "../../../types.ts"

import { GithubStatsCommitActivity } from "./github-stats-commit-activity-schema.ts"

/**
 * # Get the last year of commit activity #
 * Returns the last year of commit activity grouped by week. The days array is a group of commits per day, starting on Sunday.
 */
export function getFakeGithubStatsCommitActivity(
  partial: DeepPartial<GithubStatsCommitActivity> = {},
): GithubStatsCommitActivity {
  const base: GithubStatsCommitActivity = {
    "days": [0, 3, 26, 20, 39, 1, 0],
    "total": 89,
    "week": 1336280400,
  }
  return deepMerge(base, partial as GithubStatsCommitActivity)
}
