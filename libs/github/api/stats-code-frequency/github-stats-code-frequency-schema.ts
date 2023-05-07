import { z } from "zod"

export const githubStatsCodeFrequencySchema = z.array(z.number().int()).describe("Code Frequency Stat")

export type GithubStatsCodeFrequency = z.infer<typeof githubStatsCodeFrequencySchema>

export const dbCodeFrequencySchema = z.object({
  time: z.number(),
  timeStr: z.string(),
  additions: z.number().nonnegative(),
  deletions: z.number().nonpositive(),
})

export type DBCodeFrequency = z.infer<typeof dbCodeFrequencySchema>
