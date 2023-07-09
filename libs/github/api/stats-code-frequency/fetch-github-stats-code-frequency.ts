import { fetchExhaustively } from "../../../fetching/fetch-exhaustively.ts"

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

  for await (
    const { data } of _internals.fetchExhaustively(req, githubRestSpec.statsCodeFrequency.schema, { retries: 10 })
  ) {
    for (const el of data) {
      yield el
    }
  }
}

export const _internals = {
  fetchExhaustively: fetchExhaustively,
}
