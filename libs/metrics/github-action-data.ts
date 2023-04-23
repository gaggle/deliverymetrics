import { daysBetween, filterIter } from "../utils/mod.ts"
import { ActionRun, ActionWorkflow, ReadonlyGithubClient } from "../github/mod.ts"

import { AbortError } from "../errors.ts"

type YieldActionWorkflowData = {
  actionWorkflow: ActionWorkflow
  actionRunGenerator: AsyncGenerator<ActionRun>
}

export async function* yieldActionData(
  gh: ReadonlyGithubClient,
  { actionRun, signal }: Partial<{ actionRun: { maxDays: number; branch?: string }; signal: AbortSignal }> = {},
): AsyncGenerator<YieldActionWorkflowData> {
  const latestWorkflowSync = await gh.findLatestSync({ type: "action-workflow" })
  if (!latestWorkflowSync) return

  for await (const actionWorkflow of gh.findActionWorkflows()) {
    if (signal?.aborted) {
      throw new AbortError()
    }

    const actionRunGenerator = await filterIter((el: ActionRun) => {
      if (signal?.aborted) {
        throw new AbortError()
      }

      if (
        daysBetween(new Date(el.created_at), new Date(latestWorkflowSync.updatedAt!)) > (actionRun?.maxDays || Infinity)
      ) {
        return false
      }

      return true
    }, gh.findActionRuns({ path: actionWorkflow.path, branch: actionRun?.branch }))

    yield { actionWorkflow, actionRunGenerator }
  }
}
