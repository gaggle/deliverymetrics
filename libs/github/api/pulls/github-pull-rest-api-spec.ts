import { z } from "zod"

import { githubPullSchema } from "./github-pull-schema.ts"

export const githubPullRestApiSpec = {
  getUrl: (owner: string, repo: string) => {
    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/pulls`)
    url.searchParams.set("state", "all")
    url.searchParams.set("sort", "updated")
    url.searchParams.set("direction", "desc")
    return url.toString()
  },
  schema: z.array(githubPullSchema),
}
