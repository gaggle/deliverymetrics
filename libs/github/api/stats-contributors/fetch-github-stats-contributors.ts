import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"

import { githubStatsContributorRestApiSpec } from "./github-stats-contributor-rest-api-spec.ts"
import { GithubStatsContributor } from "./github-stats-contributor-schema.ts"

export async function* fetchGithubStatsContributors(
  owner: string,
  repo: string,
  token?: string,
  { signal }: Partial<{ signal: AbortSignal }> = {},
): AsyncGenerator<GithubStatsContributor> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubStatsContributorRestApiSpec.getUrl(owner, repo),
  })

  for await (
    const { data } of _internals.fetchGithubApiExhaustively(req, githubStatsContributorRestApiSpec.schema, {
      retryStrategy: "github-backoff",
      maxRetries: 20,
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
