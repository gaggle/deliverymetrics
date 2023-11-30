import { z } from "zod"

import { githubStatsPunchCardSchema } from "./github-stats-punch-card-schema.ts"

export const githubStatsPunchCardRestApiSpec = {
  getUrl: (owner: string, repo: string) =>
    new URL(`https://api.github.com/repos/${owner}/${repo}/stats/punch_card`).toString(),
  schema: z.array(githubStatsPunchCardSchema),
}
