import { fetchExhaustively2 } from "../../../fetching2/fetch-exhaustively.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubStatsCodeFrequency } from "./github-stats-code-frequency-schema.ts"

export async function* fetchGithubStatsCodeFrequency(
  owner: string,
  repo: string,
  token?: string,
): AsyncGenerator<GithubStatsCodeFrequency> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.statsCodeFrequency.getUrl(owner, repo),
  })

  for await (const { data } of _internals.fetchExhaustively2(req, githubRestSpec.statsCodeFrequency.schema)) {
    for (const el of data) {
      yield el
    }
  }
}

const _internals = {
  fetchExhaustively2,
}
