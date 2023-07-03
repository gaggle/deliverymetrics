import { fetchExhaustively } from "../../../fetching/mod.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { GithubPull } from "../pulls/mod.ts"

import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubPullCommit } from "./github-pull-commit-schema.ts"

export async function* fetchGithubPullCommits(
  pull: Pick<GithubPull, "commits_url">,
  token?: string,
): AsyncGenerator<GithubPullCommit> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.pullCommits.getUrl(pull),
  })

  for await (const { data } of _internals.fetchExhaustively(req, githubRestSpec.pullCommits.schema)) {
    for (const el of data) {
      yield el
    }
  }
}

export const _internals = {
  fetchExhaustively: fetchExhaustively,
}
