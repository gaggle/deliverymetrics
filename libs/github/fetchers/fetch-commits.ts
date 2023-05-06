import * as z from "zod"
import { deepMerge } from "std:deep-merge"

import { fetchExhaustively } from "../../fetching/mod.ts"
import { parseWithZodSchema } from "../../utils/mod.ts"

import { Epoch } from "../../types.ts"

import { createGithubRequest } from "../utils/mod.ts"
import { GithubCommit, githubRestSpec } from "../schemas/mod.ts"

type FetchCommitsOpts = { newerThan?: Epoch; fetchLike: typeof fetch }

export async function* fetchCommits(
  owner: string,
  repo: string,
  token?: string,
  opts: Partial<FetchCommitsOpts> = {},
): AsyncGenerator<GithubCommit> {
  const { newerThan, fetchLike }: FetchCommitsOpts = deepMerge({ fetchLike: fetch }, opts)

  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.commits.getUrl(owner, repo, newerThan ? toISOStringWithoutMs(newerThan) : undefined),
  })

  for await (const resp of fetchExhaustively(req, { fetchLike })) {
    if (!resp.ok) {
      throw new Error(`${resp.status} ${resp.statusText} (${req.url}): ${await resp.text()}`)
    }

    const data: z.infer<typeof githubRestSpec.commits.schema> = await resp.json()
    parseWithZodSchema(data, githubRestSpec.commits.schema)

    for (const el of data) {
      yield el
    }
  }
}

function toISOStringWithoutMs(...args: ConstructorParameters<typeof Date>) {
  return new Date(...args).toISOString().split(".")[0] + "Z"
}
