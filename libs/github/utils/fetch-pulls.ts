import * as z from "zod"
import { debug } from "std:log"
import { deepMerge } from "std:deep-merge"

import { fetchExhaustively } from "../../fetching/mod.ts"
import { stringifyPull } from "../../utils/mod.ts"

import { Epoch } from "../../types.ts"

import { GithubPull, githubRestSpec } from "../types/mod.ts"

import { createGithubRequest } from "./create-github-request.ts"

type FetchPullsOpts = { from?: Epoch; fetchLike: typeof fetch }

export async function* fetchPulls(
  owner: string,
  repo: string,
  token?: string,
  opts: Partial<FetchPullsOpts> = {},
): AsyncGenerator<GithubPull> {
  const { from, fetchLike }: FetchPullsOpts = deepMerge({
    from: undefined,
    fetchLike: fetch,
  }, opts)

  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.pulls.getUrl(owner, repo),
  })

  for await (const resp of fetchExhaustively(req, { fetchLike })) {
    if (!resp.ok) {
      throw new Error(`${resp.status} ${resp.statusText} (${req.url}): ${await resp.text()}`)
    }

    const data: z.infer<typeof githubRestSpec.pulls.schema> = await resp.json()
    githubRestSpec.pulls.schema.parse(data)

    for (const pull of data) {
      if (from) {
        const updatedAtDate = new Date(pull.updated_at)
        if (updatedAtDate.getTime() < from) {
          const fromDate = new Date(from)
          debug(
            `Reached pull not updated since ${fromDate.toLocaleString()}: ${stringifyPull(pull)}`,
          )
          return
        }
      }
      yield pull
    }
  }
}
