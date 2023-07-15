import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"
import { githubRestSpec } from "../github-rest-api-spec.ts"

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
    url: githubRestSpec.statsContributors.getUrl(owner, repo),
  })

  for await (
    const { data } of _internals.fetchGithubApiExhaustively(req, githubRestSpec.statsContributors.schema, {
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
