import { GithubActionRun } from "../github/api/action-run/github-action-run-schema.ts"
import { GithubActionWorkflow } from "../github/api/action-workflows/github-action-workflow-schema.ts"

export type ActionRunData = {
  run: GithubActionRun
  /** Duration in ms */
  duration?: number
}

export type YieldActionWorkflowData = {
  actionWorkflow: GithubActionWorkflow
  actionRunDataGenerator: AsyncGenerator<ActionRunData>
}
