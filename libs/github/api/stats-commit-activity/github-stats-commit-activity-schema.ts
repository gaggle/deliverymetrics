import { z } from "zod"

export const githubStatsCommitActivitySchema = z
  .object({
    days: z.tuple([
      z.number().int(), // sunday
      z.number().int(), // monday
      z.number().int(), // tuesday
      z.number().int(), // wednesday
      z.number().int(), // thursday
      z.number().int(), // friday
      z.number().int(), // saturday
    ]),
    total: z.number().int(),
    week: z.number().int(),
  })
  .describe("Commit Activity")

export type GithubStatsCommitActivity = z.infer<typeof githubStatsCommitActivitySchema>
