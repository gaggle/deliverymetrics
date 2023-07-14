import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchAPIExhaustively } from "../fetch-api-exhaustively.ts"
import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubStatsParticipation } from "./github-stats-participation-schema.ts"

export async function* fetchGithubStatsParticipation(
  owner: string,
  repo: string,
  token?: string,
): AsyncGenerator<GithubStatsParticipation> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.statsParticipation.getUrl(owner, repo),
  })

  for await (
    const { data } of _internals.fetchAPIExhaustively(req, githubRestSpec.statsParticipation.schema, {
      retryStrategy: "github-backoff",
      maxRetries: 10,
    })
  ) {
    yield data
  }
}

export const _internals = {
  fetchAPIExhaustively: fetchAPIExhaustively,
}
