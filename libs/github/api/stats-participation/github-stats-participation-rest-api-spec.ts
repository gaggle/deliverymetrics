import { githubStatsParticipationSchema } from "./github-stats-participation-schema.ts"

export const githubStatsParticipationRestApiSpec = {
  getUrl: (owner: string, repo: string) =>
    new URL(`https://api.github.com/repos/${owner}/${repo}/stats/participation`).toString(),
  schema: githubStatsParticipationSchema,
}
