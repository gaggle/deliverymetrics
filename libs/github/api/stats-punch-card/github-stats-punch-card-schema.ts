import { z } from "zod"

export const githubStatsPunchCardSchema = z.array(z.number().int()).describe("Code Frequency Stat")

export type GithubStatsPunchCard = z.infer<typeof githubStatsPunchCardSchema>

export const dbPunchCardSchema = z.object({
  day: z.number().min(0).max(6),
  hour: z.number().min(0).max(23),
  commits: z.number(),
})

export type DBPunchCard = z.infer<typeof dbPunchCardSchema>
