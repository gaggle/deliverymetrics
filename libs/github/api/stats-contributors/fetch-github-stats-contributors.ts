import { warning } from "std:log"

import { FetchError } from "../../../../utils/errors.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"

import { githubStatsContributorRestApiSpec } from "./github-stats-contributor-rest-api-spec.ts"
import { GithubStatsContributor } from "./github-stats-contributor-schema.ts"

export async function* fetchGithubStatsContributors(
  owner: string,
  repo: string,
  token?: string,
  { signal }: Partial<{ signal: AbortSignal }> = {},
): AsyncGenerator<GithubStatsContributor> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubStatsContributorRestApiSpec.getUrl(owner, repo),
  })
  try {
    for await (
      const { data } of _internals.fetchGithubApiExhaustively(req, githubStatsContributorRestApiSpec.schema, {
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
