import { z } from "zod"

import { githubStatsCommitActivitySchema } from "./github-stats-commit-activity-schema.ts"

export const githubStatsCommitActivityRestApiSpec = {
  getUrl: (owner: string, repo: string) =>
    new URL(`https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`).toString(),
  schema: z.array(githubStatsCommitActivitySchema),
}
