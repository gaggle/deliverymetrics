import { debug } from "std:log"

import { Epoch } from "../../../types.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"
import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubRelease } from "./github-release-schema.ts"

type FetchPullsOpts = { newerThan?: Epoch; signal?: AbortSignal }

export async function* fetchGithubReleases(
  owner: string,
  repo: string,
  token?: string,
  { newerThan, signal }: Partial<FetchPullsOpts> = {},
): AsyncGenerator<GithubRelease> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.releases.getUrl(owner, repo),
  })

  for await (const { data } of _internals.fetchGithubApiExhaustively(req, githubRestSpec.releases.schema, { signal })) {
    for (const el of data) {
      if (newerThan) {
        const fromDate = new Date(el.created_at)
        if (fromDate.getTime() < newerThan) {
          debug(`Reached release not updated since ${fromDate.toLocaleString()}: ${el.html_url}`)
          return
        }
      }
      yield el
    }
  }
}

export const _internals = {
  fetchGithubApiExhaustively,
}
