import * as z from "zod"
import { deepMerge } from "std:deep-merge"

import { fetchExhaustively } from "../../../fetching/mod.ts"
import { parseWithZodSchema } from "../../../utils/mod.ts"

import { Epoch } from "../../../types.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubRelease } from "./github-release-schema.ts"
import { debug } from "std:log"

type FetchPullsOpts = { newerThan?: Epoch; fetchLike: typeof fetch }

export async function* fetchGithubReleases(
  owner: string,
  repo: string,
  token?: string,
  opts: Partial<FetchPullsOpts> = {},
): AsyncGenerator<GithubRelease> {
  const { newerThan, fetchLike }: FetchPullsOpts = deepMerge({ fetchLike: fetch }, opts)

  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.releases.getUrl(owner, repo),
  })

  for await (const resp of fetchExhaustively(req, { fetchLike })) {
    if (!resp.ok) {
      throw new Error(`${resp.status} ${resp.statusText} (${req.url}): ${await resp.text()}`)
    }

    const data: z.infer<typeof githubRestSpec.releases.schema> = await resp.json()
    parseWithZodSchema(data, githubRestSpec.releases.schema)

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
