import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchAPIExhaustively } from "../fetch-api-exhaustively.ts"
import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubStatsPunchCard } from "./github-stats-punch-card-schema.ts"

export async function* fetchGithubStatsPunchCard(
  owner: string,
  repo: string,
  token?: string,
): AsyncGenerator<GithubStatsPunchCard> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.statsPunchCard.getUrl(owner, repo),
  })

  for await (
    const { data } of _internals.fetchAPIExhaustively(req, githubRestSpec.statsPunchCard.schema, {
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
