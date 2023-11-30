import { Epoch } from "../../../../utils/types.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"

import { githubCommitRestApiSpec } from "./github-commit-rest-api-spec.ts"
import { GithubCommit } from "./github-commit-schema.ts"

type FetchCommitsOpts = { newerThan?: Epoch; signal?: AbortSignal }

export async function* fetchGithubCommits(
  owner: string,
  repo: string,
  token?: string,
  { newerThan, signal }: Partial<FetchCommitsOpts> = {},
): AsyncGenerator<GithubCommit> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubCommitRestApiSpec.getUrl(owner, repo, newerThan ? toISOStringWithoutMs(newerThan) : undefined),
  })

  for await (const { data } of _internals.fetchGithubApiExhaustively(req, githubCommitRestApiSpec.schema, { signal })) {
    for (const el of data) {
      yield el
    }
  }
}

function toISOStringWithoutMs(...args: ConstructorParameters<typeof Date>) {
  return new Date(...args).toISOString().split(".")[0] + "Z"
}

export const _internals = {
  fetchGithubApiExhaustively,
}
