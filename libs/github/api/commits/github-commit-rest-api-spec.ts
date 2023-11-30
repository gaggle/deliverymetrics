import { z } from "zod"

import { githubCommitSchema } from "./github-commit-schema.ts"

export const githubCommitRestApiSpec = {
  /**
   * @param owner The account owner of the repository. The name is not case-sensitive.
   * @param repo The name of the repository. The name is not case-sensitive.
   * @param since Only show notifications updated after the given time.
   *              This is a timestamp in ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`.
   */
  getUrl: (owner: string, repo: string, since?: string) => {
    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/commits`)
    if (since) url.searchParams.set("since", since)
    return url.toString()
  },
  schema: z.array(githubCommitSchema),
}
