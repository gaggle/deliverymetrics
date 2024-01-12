import { warning } from "std:log"

import { FetchError } from "../../../../utils/errors.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"

import { githubStatsCodeFrequencyRestApiSpec } from "./github-stats-code-frequency-rest-api-spec.ts"
import { GithubStatsCodeFrequency } from "./github-stats-code-frequency-schema.ts"

export async function* fetchGithubStatsCodeFrequency(
  owner: string,
  repo: string,
  token?: string,
  { signal }: Partial<{ signal: AbortSignal }> = {},
): AsyncGenerator<GithubStatsCodeFrequency> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubStatsCodeFrequencyRestApiSpec.getUrl(owner, repo),
  })
  try {
    for await (
      const { data } of _internals.fetchGithubApiExhaustively(req, githubStatsCodeFrequencyRestApiSpec.schema, {
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
