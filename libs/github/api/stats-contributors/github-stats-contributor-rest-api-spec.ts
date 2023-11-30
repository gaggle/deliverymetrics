import { z } from "zod"

import { githubStatsContributorSchema } from "./github-stats-contributor-schema.ts"

export const githubStatsContributorRestApiSpec = {
  getUrl: (owner: string, repo: string) =>
    new URL(`https://api.github.com/repos/${owner}/${repo}/stats/contributors`).toString(),
  schema: z.array(githubStatsContributorSchema),
}
