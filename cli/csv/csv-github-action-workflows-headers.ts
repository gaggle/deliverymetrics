import { ActionWorkflow, actionWorkflowSchema } from "../../libs/github/types/github-action-workflow.ts"

import { yieldActionData } from "../../libs/metrics/github-action-data.ts"

import { ToTuple } from "../../libs/types.ts"

const extraHeaders = [] as const

export const githubActionWorkflowHeaders = [
  ...extraHeaders,
  ...Object.keys(actionWorkflowSchema.shape).sort(),
] as unknown as GithubActionWorkflowHeaders

type GithubActionWorkflowHeader = typeof extraHeaders[number] | keyof ActionWorkflow

export type GithubActionWorkflowHeaders = ToTuple<GithubActionWorkflowHeader>

export type GithubActionWorkflowRow = Record<GithubActionWorkflowHeaders[number], string>

export async function* githubActionWorkflowAsCsv(
  iter: ReturnType<typeof yieldActionData>,
): AsyncGenerator<GithubActionWorkflowRow> {
  for await (const { actionWorkflow } of iter) {
    yield {
      id: actionWorkflow.id.toString(),
      node_id: actionWorkflow.node_id,
      name: actionWorkflow.name,
      path: actionWorkflow.path,
      state: actionWorkflow.state,
      created_at: actionWorkflow.created_at,
      updated_at: actionWorkflow.updated_at,
      url: actionWorkflow.url,
      html_url: actionWorkflow.html_url,
      badge_url: actionWorkflow.badge_url,
      deleted_at: actionWorkflow.deleted_at || "",
    }
  }
}
