import { debug } from "std:log"

import { Epoch } from "../../../../utils/types.ts"

import { createGithubRequest, stringifyPull } from "../../github-utils/mod.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"
import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubPull } from "./github-pull-schema.ts"

type FetchPullsOpts = { newerThan?: Epoch; signal?: AbortSignal }

export async function* fetchGithubPulls(
  owner: string,
  repo: string,
  token?: string,
  { newerThan, signal }: Partial<FetchPullsOpts> = {},
): AsyncGenerator<GithubPull> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.pulls.getUrl(owner, repo),
  })

  for await (const { data } of _internals.fetchGithubApiExhaustively(req, githubRestSpec.pulls.schema, { signal })) {
    for (const pull of data) {
      if (newerThan) {
        const updatedAtDate = new Date(pull.updated_at)
        if (updatedAtDate.getTime() < newerThan) {
          debug(`Reached pull not updated since ${new Date(newerThan).toLocaleString()}: ${stringifyPull(pull)}`)
          return
        }
      }
      yield pull
    }
  }
}

export const _internals = {
  fetchGithubApiExhaustively,
}
