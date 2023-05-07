import { z } from "zod"

export const githubStatsPunchCardSchema = z.array(z.number().int()).describe("Code Frequency Stat")

export type GithubStatsPunchCard = z.infer<typeof githubStatsPunchCardSchema>
