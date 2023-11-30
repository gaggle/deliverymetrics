import { githubRepositorySchema } from "./github-repository-schema.ts"

export const githubRepositoryRestApiSpec = {
  getUrl: (owner: string, repo: string) => new URL(`https://api.github.com/repos/${owner}/${repo}`).toString(),
  schema: githubRepositorySchema,
}
