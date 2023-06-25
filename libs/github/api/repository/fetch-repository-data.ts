import * as z from "zod"
import { deepMerge } from "std:deep-merge"

import { parseWithZodSchema } from "../../../utils/mod.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubRepository } from "./github-repository-schema.ts"

type FetchRepositoryDataOpts = {
  fetchLike: typeof fetch
}

export async function fetchRepositoryData(
  owner: string,
  repo: string,
  token?: string,
  opts: Partial<FetchRepositoryDataOpts> = {},
): Promise<GithubRepository> {
  const { fetchLike }: FetchRepositoryDataOpts = deepMerge({ fetchLike: fetch }, opts)

  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.repository.getUrl(owner, repo),
  })

  const resp = await fetchLike(req)
  if (!resp.ok) {
    throw new Error(`${resp.status} ${resp.statusText} (${req.url}): ${await resp.text()}`)
  }
  const data: z.infer<typeof githubRestSpec.repository.schema> = await resp.json()
  parseWithZodSchema(data, githubRestSpec.repository.schema)
  return data
}
