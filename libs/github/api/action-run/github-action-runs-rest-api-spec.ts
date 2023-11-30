import { z } from "zod"

import { githubActionRunSchema } from "./github-action-run-schema.ts"

export const githubActionRunsRestApiSpec = {
  getUrl: (owner: string, repo: string, branch?: string) => {
    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/actions/runs`)
    url.searchParams.set("per_page", "50")
    // ↑ Occasionally the API would return 502 Bad Gateway when per_page=100 (despite retrying)
    if (branch) {
      url.searchParams.set("branch", branch)
    }
    return url.toString()
  },
  schema: z.object({ total_count: z.number().int(), workflow_runs: z.array(githubActionRunSchema) }),
}
