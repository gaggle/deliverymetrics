import { warning } from "std:log"

import { FetchError } from "../../../../utils/errors.ts"

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
  try {
    for await (
      const { data } of _internals.fetchGithubApiExhaustively(req, githubStatsParticipationRestApiSpec.schema, {
        retryStrategy: "github-backoff",
        maxRetries: 20,
        signal,
      })
    ) {
      yield data
    }
  } catch (err) {
    if (err instanceof FetchError) {
      if (err.response?.status === 422) {
        warning(`Giving up ${err.response.url} due to ${err.response.status}`)
        return
      }
    }
    throw err
  }
}

export const _internals = {
  fetchGithubApiExhaustively,
}
