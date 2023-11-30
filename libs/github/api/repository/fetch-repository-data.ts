import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"

import { githubRepositoryRestApiSpec } from "./github-repository-rest-api-spec.ts"
import { GithubRepository } from "./github-repository-schema.ts"

export async function* fetchRepositoryData(
  owner: string,
  repo: string,
  token?: string,
  { signal }: Partial<{ signal: AbortSignal }> = {},
): AsyncGenerator<GithubRepository> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRepositoryRestApiSpec.getUrl(owner, repo),
  })

  for await (
    const { data } of _internals.fetchGithubApiExhaustively(req, githubRepositoryRestApiSpec.schema, { signal })
  ) {
    yield data
  }
}

export const _internals = {
  fetchGithubApiExhaustively,
}
