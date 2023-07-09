import { z } from "zod"

export const githubStatsPunchCardSchema = z.array(z.number().int()).describe("Code Frequency Stat")

export type GithubStatsPunchCard = z.infer<typeof githubStatsPunchCardSchema>

export const dbPunchCardSchema = z.object({
  day: z.number().min(0).max(6),
  hour: z.number().min(0).max(23),
  commits: z.number(),
})

export type DBPunchCard = z.infer<typeof dbPunchCardSchema>

export type DBPunchCardRead = DBPunchCard & {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6
  hour: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23
}
