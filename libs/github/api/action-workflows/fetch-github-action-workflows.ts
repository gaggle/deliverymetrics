import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchAPIExhaustively } from "../fetch-api-exhaustively.ts"
import { githubRestSpec } from "../github-rest-api-spec.ts"

import { GithubActionWorkflow } from "./github-action-workflow-schema.ts"

export async function* fetchGithubActionWorkflows(
  owner: string,
  repo: string,
  token?: string,
): AsyncGenerator<GithubActionWorkflow> {
  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.actionWorkflows.getUrl(owner, repo),
  })

  for await (const { data } of fetchAPIExhaustively(req, githubRestSpec.actionWorkflows.schema)) {
    for (const el of data.workflows) {
      yield el
    }
  }
}
