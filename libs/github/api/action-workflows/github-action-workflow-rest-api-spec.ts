import { z } from "zod"

import { githubActionWorkflowSchema } from "./github-action-workflow-schema.ts"

export const githubActionWorkflowRestApiSpec = {
  getUrl: (owner: string, repo: string) =>
    new URL(`https://api.github.com/repos/${owner}/${repo}/actions/workflows`).toString(),
  schema: z.object({ total_count: z.number().int(), workflows: z.array(githubActionWorkflowSchema) }),
}
