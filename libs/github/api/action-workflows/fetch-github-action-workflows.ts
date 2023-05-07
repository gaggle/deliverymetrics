import * as z from "zod"
import { deepMerge } from "std:deep-merge"

import { fetchExhaustively } from "../../../fetching/mod.ts"
import { parseWithZodSchema } from "../../../utils/mod.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubActionWorkflow } from "./github-action-workflow-schema.ts"

type FetchWorkflowsOpts = { fetchLike: typeof fetch }

export async function* fetchGithubActionWorkflows(
  owner: string,
  repo: string,
  token?: string,
  opts: Partial<FetchWorkflowsOpts> = {},
): AsyncGenerator<GithubActionWorkflow> {
  const { fetchLike }: FetchWorkflowsOpts = deepMerge({ fetchLike: fetch }, opts)

  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.actionWorkflows.getUrl(owner, repo),
  })

  for await (const resp of fetchExhaustively(req, { fetchLike })) {
    if (!resp.ok) {
      throw new Error(`${resp.status} ${resp.statusText} (${req.url}): ${await resp.text()}`)
    }

    const data: z.infer<typeof githubRestSpec.actionWorkflows.schema> = await resp.json()
    parseWithZodSchema(data, githubRestSpec.actionWorkflows.schema)

    for (const el of data.workflows) {
      yield el
    }
  }
}
