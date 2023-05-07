import * as z from "zod"
import { deepMerge } from "std:deep-merge"

import { fetchExhaustively } from "../../../fetching/mod.ts"
import { parseWithZodSchema } from "../../../utils/mod.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubStatsCodeFrequency } from "./github-stats-code-frequency-schema.ts"

type FetchPullsOpts = { fetchLike: typeof fetch }

export async function* fetchGithubStatsCodeFrequency(
  owner: string,
  repo: string,
  token?: string,
  opts: Partial<FetchPullsOpts> = {},
): AsyncGenerator<GithubStatsCodeFrequency> {
  const { fetchLike }: FetchPullsOpts = deepMerge({ fetchLike: fetch }, opts)

  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.statsCodeFrequency.getUrl(owner, repo),
  })

  for await (const resp of fetchExhaustively(req, { fetchLike })) {
    if (!resp.ok) {
      throw new Error(`${resp.status} ${resp.statusText} (${req.url}): ${await resp.text()}`)
    }

    const data: z.infer<typeof githubRestSpec.statsCodeFrequency.schema> = await resp.json()
    parseWithZodSchema(data, githubRestSpec.statsCodeFrequency.schema)

    for (const el of data) {
      yield el
    }
  }
}
