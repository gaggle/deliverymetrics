import * as z from "zod"

import { fetchExhaustively } from "../../../fetching/mod.ts"
import { parseWithZodSchema } from "../../../utils/mod.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubPull } from "../pulls/github-pull-schema.ts"
import { GithubPullCommit } from "./github-pull-commit-schema.ts"

type FetchPullCommitsOpts = { fetchLike: typeof fetch }

export async function* fetchGithubPullCommits(
  pull: Pick<GithubPull, "commits_url">,
  token?: string,
  { fetchLike }: Partial<FetchPullCommitsOpts> = {},
): AsyncGenerator<GithubPullCommit> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.pullCommits.getUrl(pull),
  })

  for await (const resp of fetchExhaustively(req, { fetchLike: fetchLike || fetch })) {
    if (!resp.ok) {
      throw new Error(`${resp.status} ${resp.statusText} (${req.url}): ${await resp.text()}`)
    }

    const data: z.infer<typeof githubRestSpec.pullCommits.schema> = await resp.json()
    parseWithZodSchema(data, githubRestSpec.pullCommits.schema)

    for (const el of data) {
      yield el
    }
  }
}
