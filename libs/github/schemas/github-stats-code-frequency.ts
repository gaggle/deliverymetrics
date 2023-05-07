import { z } from "zod"

export const githubStatsCodeFrequencySchema = z.array(z.number().int()).describe("Code Frequency Stat")

export type GithubStatsCodeFrequency = z.infer<typeof githubStatsCodeFrequencySchema>
