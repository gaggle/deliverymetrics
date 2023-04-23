import * as z from "zod"
import { debug } from "std:log"
import { deepMerge } from "std:deep-merge"

import { fetchExhaustively } from "../../fetching/mod.ts"
import { stringifyPull } from "../../utils/mod.ts"

import { Epoch } from "../../types.ts"

import { createGithubRequest } from "../utils/create-github-request.ts"

import { GithubPull, githubRestSpec } from "../types/mod.ts"

type FetchPullsOpts = { newerThan?: Epoch; fetchLike: typeof fetch }

export async function* fetchPulls(
  owner: string,
  repo: string,
  token?: string,
  opts: Partial<FetchPullsOpts> = {},
): AsyncGenerator<GithubPull> {
  const { newerThan, fetchLike }: FetchPullsOpts = deepMerge({ fetchLike: fetch }, opts)

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
