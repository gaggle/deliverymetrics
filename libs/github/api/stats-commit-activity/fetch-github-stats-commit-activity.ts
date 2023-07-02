import { fetchExhaustively2 } from "../../../fetching2/mod.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubStatsCommitActivity } from "./github-stats-commit-activity-schema.ts"

export async function* fetchGithubStatsCommitActivity(
  owner: string,
  repo: string,
  token?: string,
): AsyncGenerator<GithubStatsCommitActivity> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.statsCommitActivity.getUrl(owner, repo),
  })

  for await (const { data } of _internals.fetchExhaustively2(req, githubRestSpec.statsCommitActivity.schema)) {
    for (const el of data) {
      yield el
    }
  }
}

export const _internals = {
  fetchExhaustively2,
}
