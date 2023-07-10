import { fetchExhaustively } from "../../../fetching/mod.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

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
    const { data } of _internals.fetchExhaustively(req, githubRestSpec.statsPunchCard.schema, {
      strategy: "github-backoff",
      retries: 10,
    })
  ) {
    for (const el of data) {
      yield el
    }
  }
}

export const _internals = {
  fetchExhaustively: fetchExhaustively,
}
