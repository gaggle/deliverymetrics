import { z } from "zod"

import { githubReleaseSchema } from "./github-release-schema.ts"

export const githubReleaseRestApiSpec = {
  getUrl: (owner: string, repo: string) => {
    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/releases`)
    url.searchParams.set("per_page", "100")
    return url.toString()
  },
  schema: z.array(githubReleaseSchema),
}
