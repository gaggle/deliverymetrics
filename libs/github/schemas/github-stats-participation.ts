import { z } from "zod"

export const githubStatsParticipationSchema = z.object({
  all: z.array(z.number().int()),
  owner: z.array(z.number().int()),
})

export type GithubStatsParticipation = z.infer<typeof githubStatsParticipationSchema>
