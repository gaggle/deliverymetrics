import { debug } from "std:log"

import { fetchExhaustively2 } from "../../../fetching2/mod.ts"

import { Epoch } from "../../../types.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubRelease } from "./github-release-schema.ts"

type FetchPullsOpts = { newerThan?: Epoch }

export async function* fetchGithubReleases(
  owner: string,
  repo: string,
  token?: string,
  { newerThan }: Partial<FetchPullsOpts> = {},
): AsyncGenerator<GithubRelease> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.releases.getUrl(owner, repo),
  })

  for await (const { data } of _internals.fetchExhaustively2(req, githubRestSpec.releases.schema)) {
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

const _internals = {
  fetchExhaustively2,
}
