import { warning } from "std:log"

import { FetchError } from "../../../../utils/errors.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"

import { githubStatsPunchCardRestApiSpec } from "./github-stats-punch-card-rest-api-spec.ts"
import { GithubStatsPunchCard } from "./github-stats-punch-card-schema.ts"

export async function* fetchGithubStatsPunchCard(
  owner: string,
  repo: string,
  token?: string,
  { signal }: Partial<{ signal: AbortSignal }> = {},
): AsyncGenerator<GithubStatsPunchCard> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubStatsPunchCardRestApiSpec.getUrl(owner, repo),
  })

  try {
    for await (
      const { data } of _internals.fetchGithubApiExhaustively(req, githubStatsPunchCardRestApiSpec.schema, {
        retryStrategy: "github-backoff",
        maxRetries: 20,
        signal,
      })
    ) {
      for (const el of data) {
        yield el
      }
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
