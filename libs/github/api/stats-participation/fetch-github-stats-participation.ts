import * as z from "zod"
import { deepMerge } from "std:deep-merge"

import { fetchExhaustively } from "../../../fetching/mod.ts"
import { parseWithZodSchema } from "../../../utils/mod.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubStatsParticipation } from "./github-stats-participation-schema.ts"

type FetchPullsOpts = { fetchLike: typeof fetch }

export async function* fetchGithubStatsParticipation(
  owner: string,
  repo: string,
  token?: string,
  opts: Partial<FetchPullsOpts> = {},
): AsyncGenerator<GithubStatsParticipation> {
  const { fetchLike }: FetchPullsOpts = deepMerge({ fetchLike: fetch }, opts)

  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.statsParticipation.getUrl(owner, repo),
  })

  for await (const resp of fetchExhaustively(req, { fetchLike })) {
    if (!resp.ok) {
      throw new Error(`${resp.status} ${resp.statusText} (${req.url}): ${await resp.text()}`)
    }

    const data: z.infer<typeof githubRestSpec.statsParticipation.schema> = await resp.json()
    parseWithZodSchema(data, githubRestSpec.statsParticipation.schema)

    for (const punchCard of data) {
      yield punchCard
    }
  }
}
