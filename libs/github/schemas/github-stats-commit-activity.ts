import { z } from "zod"

export const githubStatsCommitActivitySchema = z
  .object({
    days: z.array(z.number().int()),
    total: z.number().int(),
    week: z.number().int(),
  })
  .describe("Commit Activity")

export type GithubStatsCommitActivity = z.infer<typeof githubStatsCommitActivitySchema>
