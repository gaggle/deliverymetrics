import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"

import { githubStatsPunchCardRestApiSpec } from "./github-stats-punch-card-rest-api-spec.ts"
import { GithubStatsPunchCard } from "./github-stats-punch-card-schema.ts"

export async function* fetchGithubStatsPunchCard(
  owner: string,
  repo: string,
  token?: string,
  { signal }: Partial<{ signal: AbortSignal }> = {},
): AsyncGenerator<GithubStatsPunchCard> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubStatsPunchCardRestApiSpec.getUrl(owner, repo),
  })

  for await (
    const { data } of _internals.fetchGithubApiExhaustively(req, githubStatsPunchCardRestApiSpec.schema, {
      retryStrategy: "github-backoff",
      maxRetries: 10,
      signal,
    })
  ) {
    for (const el of data) {
      yield el
    }
  }
}

export const _internals = {
  fetchGithubApiExhaustively,
}
