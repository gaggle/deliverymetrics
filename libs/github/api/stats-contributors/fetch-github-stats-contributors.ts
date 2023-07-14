import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchAPIExhaustively } from "../fetch-api-exhaustively.ts"
import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubStatsContributor } from "./github-stats-contributor-schema.ts"

export async function* fetchGithubStatsContributors(
  owner: string,
  repo: string,
  token?: string,
): AsyncGenerator<GithubStatsContributor> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.statsContributors.getUrl(owner, repo),
  })

  for await (
    const { data } of _internals.fetchAPIExhaustively(req, githubRestSpec.statsContributors.schema, {
      retryStrategy: "github-backoff",
      maxRetries: 10,
    })
  ) {
    for (const el of data) {
      yield el
    }
  }
}

export const _internals = {
  fetchAPIExhaustively: fetchAPIExhaustively,
}
