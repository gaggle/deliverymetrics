import * as z from "zod"
import { deepMerge } from "std:deep-merge"

import { fetchExhaustively } from "../../../fetching/mod.ts"
import { parseWithZodSchema } from "../../../utils/mod.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubStatsCommitActivity } from "./github-stats-commit-activity-schema.ts"

type FetchPullsOpts = { fetchLike: typeof fetch }

export async function* fetchGithubStatsCommitActivity(
  owner: string,
  repo: string,
  token?: string,
  opts: Partial<FetchPullsOpts> = {},
): AsyncGenerator<GithubStatsCommitActivity> {
  const { fetchLike }: FetchPullsOpts = deepMerge({ fetchLike: fetch }, opts)

  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.statsCommitActivity.getUrl(owner, repo),
  })

  for await (const resp of fetchExhaustively(req, { fetchLike })) {
    if (!resp.ok) {
      throw new Error(`${resp.status} ${resp.statusText} (${req.url}): ${await resp.text()}`)
    }

    const data: z.infer<typeof githubRestSpec.statsCommitActivity.schema> = await resp.json()
    parseWithZodSchema(data, githubRestSpec.statsCommitActivity.schema)

    for (const punchCard of data) {
      yield punchCard
    }
  }
}
