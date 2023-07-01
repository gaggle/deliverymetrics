import { fetchExhaustively2 } from "../../../fetching2/mod.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

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
    const { data } of _internals.fetchExhaustively2(req, githubRestSpec.statsContributors.schema, {
      strategy: "github-backoff",
    })
  ) {
    for (const el of data) {
      yield el
    }
  }
}

export const _internals = {
  fetchExhaustively2,
}
