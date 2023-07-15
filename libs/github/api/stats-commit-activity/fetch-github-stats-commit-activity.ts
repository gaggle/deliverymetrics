import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"
import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubStatsCommitActivity } from "./github-stats-commit-activity-schema.ts"

export async function* fetchGithubStatsCommitActivity(
  owner: string,
  repo: string,
  token?: string,
  { signal }: Partial<{ signal: AbortSignal }> = {},
): AsyncGenerator<GithubStatsCommitActivity> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.statsCommitActivity.getUrl(owner, repo),
  })

  for await (
    const { data } of _internals.fetchGithubApiExhaustively(req, githubRestSpec.statsCommitActivity.schema, {
      retryStrategy: "github-backoff",
      maxRetries: 10,
      signal,
    })
  ) {
    for (const el of data) {
      yield el
    }
  }
}

export const _internals = {
  fetchGithubApiExhaustively,
}
