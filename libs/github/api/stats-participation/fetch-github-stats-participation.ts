import { fetchExhaustively2 } from "../../../fetching/mod.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

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

  for await (const { data } of _internals.fetchExhaustively2(req, githubRestSpec.statsParticipation.schema)) {
    yield data
  }
}

export const _internals = {
  fetchExhaustively2,
}
