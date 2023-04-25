import * as z from "zod"

import { fetchExhaustively } from "../../fetching/mod.ts"

import { createGithubRequest } from "../utils/mod.ts"
import { GithubPull, GithubPullCommit, githubRestSpec } from "../schemas/mod.ts"

type FetchPullCommitsOpts = { fetchLike: typeof fetch }

export async function* fetchPullCommits(
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
    githubRestSpec.pullCommits.schema.parse(data)

    for (const el of data) {
      yield el
    }
  }
}
