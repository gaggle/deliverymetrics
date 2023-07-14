import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"
import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubRepository } from "./github-repository-schema.ts"

export async function* fetchRepositoryData(
  owner: string,
  repo: string,
  token?: string,
): AsyncGenerator<GithubRepository> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.repository.getUrl(owner, repo),
  })

  for await (const { data } of _internals.fetchGithubApiExhaustively(req, githubRestSpec.repository.schema)) {
    yield data
  }
}

export const _internals = {
  fetchGithubApiExhaustively,
}
