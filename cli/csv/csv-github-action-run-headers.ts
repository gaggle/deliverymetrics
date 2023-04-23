import { ActionRun, actionRunSchema } from "../../libs/github/types/github-action-run.ts"
import { ActionWorkflow } from "../../libs/github/types/github-action-workflow.ts"

import { ToTuple } from "../../libs/types.ts"

const extraHeaders = [] as const

export const githubActionRunHeaders = [
  ...extraHeaders,
  ...Object.keys(actionRunSchema.shape).sort(),
] as unknown as GithubActionRunHeaders

type GithubActionRunHeader = typeof extraHeaders[number] | keyof ActionRun

export type GithubActionRunHeaders = ToTuple<GithubActionRunHeader>

export type GithubActionRunRow = Record<GithubActionRunHeaders[number], string>

export async function* githubActionRunAsCsv(
  iter: AsyncGenerator<{ actionRun: ActionRun; workflow: ActionWorkflow }>,
): AsyncGenerator<GithubActionRunRow> {
  for await (const { actionRun } of iter) {
    yield {
      id: actionRun.id?.toString(),
      name: actionRun.name || "",
      node_id: actionRun.node_id,
      check_suite_id: actionRun.check_suite_id?.toString() || "",
      check_suite_node_id: actionRun.check_suite_node_id || "",
      head_branch: actionRun.head_branch || "",
      head_sha: actionRun.head_sha || "",
      path: actionRun.path || "",
      run_number: actionRun.run_number?.toString() || "",
      run_attempt: actionRun.run_attempt?.toString() || "",
      referenced_workflows: JSON.stringify(actionRun.referenced_workflows) || "",
      event: actionRun.event || "",
      status: actionRun.status || "",
      conclusion: actionRun.conclusion || "",
      workflow_id: actionRun.workflow_id?.toString() || "",
      url: actionRun.url || "",
      html_url: actionRun.html_url || "",
      pull_requests: JSON.stringify(actionRun.pull_requests) || "",
      created_at: actionRun.created_at || "",
      updated_at: actionRun.updated_at || "",
      actor: JSON.stringify(actionRun.actor) || "",
      triggering_actor: JSON.stringify(actionRun.triggering_actor) || "",
      run_started_at: actionRun.run_started_at || "",
      jobs_url: actionRun.jobs_url || "",
      logs_url: actionRun.logs_url || "",
      check_suite_url: actionRun.check_suite_url || "",
      artifacts_url: actionRun.artifacts_url || "",
      cancel_url: actionRun.cancel_url || "",
      rerun_url: actionRun.rerun_url || "",
      previous_attempt_url: actionRun.previous_attempt_url || "",
      workflow_url: actionRun.workflow_url || "",
      head_commit: JSON.stringify(actionRun.head_commit) || "",
      repository: JSON.stringify(actionRun.repository) || "",
      head_repository: JSON.stringify(actionRun.head_repository) || "",
      head_repository_id: actionRun.head_repository_id?.toString() || "",
      display_title: actionRun.display_title || "",
    }
  }
}
