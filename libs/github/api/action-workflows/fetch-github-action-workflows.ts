import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"

import { githubActionWorkflowRestApiSpec } from "./github-action-workflow-rest-api-spec.ts"
import { GithubActionWorkflow } from "./github-action-workflow-schema.ts"

export async function* fetchGithubActionWorkflows(
  owner: string,
  repo: string,
  token?: string,
  { signal }: Partial<{ signal: AbortSignal }> = {},
): AsyncGenerator<GithubActionWorkflow> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubActionWorkflowRestApiSpec.getUrl(owner, repo),
  })

  for await (
    const { data } of fetchGithubApiExhaustively(req, githubActionWorkflowRestApiSpec.schema, { signal })
  ) {
    for (const el of data.workflows) {
      yield el
    }
  }
}
