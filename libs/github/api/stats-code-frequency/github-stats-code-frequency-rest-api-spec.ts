import { z } from "zod"

import { githubStatsCodeFrequencySchema } from "./github-stats-code-frequency-schema.ts"

export const githubStatsCodeFrequencyRestApiSpec = {
  getUrl: (owner: string, repo: string) =>
    new URL(`https://api.github.com/repos/${owner}/${repo}/stats/code_frequency`).toString(),
  schema: z.array(githubStatsCodeFrequencySchema),
}
