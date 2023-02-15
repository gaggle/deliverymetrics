import * as z from "zod"
import { deepMerge } from "std:deep-merge"

import { fetchExhaustively, Retrier } from "../../fetching/mod.ts"

import { Epoch } from "../../types.ts"

import { GithubCommit, githubRestSpec } from "../types/mod.ts"

import { createGithubRequest } from "./create-github-request.ts"

type FetchCommitsOpts = { from?: Epoch; retrier: Retrier }

export async function* fetchCommits(
  owner: string,
  repo: string,
  token?: string,
  opts: Partial<FetchCommitsOpts> = {},
): AsyncGenerator<GithubCommit> {
  const { from, retrier }: FetchCommitsOpts = deepMerge({
    from: undefined,
    retrier: new Retrier(),
  }, opts)

  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.commits.getUrl(owner, repo, from ? toISOStringWithoutMs(from) : undefined),
  })

  for await (const resp of fetchExhaustively(req, { fetchLike: retrier.fetch.bind(retrier) })) {
    if (!resp.ok) {
      throw new Error(`Could not fetch ${req.url}, got ${resp.status} ${resp.statusText}: ${await resp.text()}`)
    }

    const data: z.infer<typeof githubRestSpec.commits.schema> = await resp.json()
    githubRestSpec.commits.schema.parse(data)

    for (const el of data) {
      yield el
    }
  }
}

function toISOStringWithoutMs(...args: ConstructorParameters<typeof Date>) {
  return new Date(...args).toISOString().split(".")[0] + "Z"
}
