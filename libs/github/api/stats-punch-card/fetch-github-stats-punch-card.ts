import { fetchExhaustively2 } from "../../../fetching/mod.ts"

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

  for await (const { data } of _internals.fetchExhaustively2(req, githubRestSpec.statsPunchCard.schema)) {
    for (const el of data) {
      yield el
    }
  }
}

export const _internals = {
  fetchExhaustively2,
}
