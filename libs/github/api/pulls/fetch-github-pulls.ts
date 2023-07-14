import { debug } from "std:log"

import { stringifyPull } from "../../../utils/mod.ts"

import { Epoch } from "../../../types.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchAPIExhaustively } from "../fetch-api-exhaustively.ts"
import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubPull } from "./github-pull-schema.ts"

type FetchPullsOpts = { newerThan?: Epoch }

export async function* fetchGithubPulls(
  owner: string,
  repo: string,
  token?: string,
  { newerThan }: Partial<FetchPullsOpts> = {},
): AsyncGenerator<GithubPull> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.pulls.getUrl(owner, repo),
  })

  for await (const { data } of _internals.fetchAPIExhaustively(req, githubRestSpec.pulls.schema)) {
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
  fetchAPIExhaustively: fetchAPIExhaustively,
}
