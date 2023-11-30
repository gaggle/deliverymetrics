import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"

import { githubStatsParticipationRestApiSpec } from "./github-stats-participation-rest-api-spec.ts"
import { GithubStatsParticipation } from "./github-stats-participation-schema.ts"

export async function* fetchGithubStatsParticipation(
  owner: string,
  repo: string,
  token?: string,
  { signal }: Partial<{ signal: AbortSignal }> = {},
): AsyncGenerator<GithubStatsParticipation> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubStatsParticipationRestApiSpec.getUrl(owner, repo),
  })

  for await (
    const { data } of _internals.fetchGithubApiExhaustively(req, githubStatsParticipationRestApiSpec.schema, {
      retryStrategy: "github-backoff",
      maxRetries: 10,
      signal,
    })
  ) {
    yield data
  }
}

export const _internals = {
  fetchGithubApiExhaustively,
}
