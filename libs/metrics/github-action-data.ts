import { AbortError, daysBetween, filterIter, mapIter } from "../../utils/mod.ts"

import { GithubActionRun } from "../github/api/action-run/mod.ts"
import { ReadonlyGithubClient } from "../github/mod.ts"

import { ActionRunData, YieldActionWorkflowData } from "./types.ts"

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

    yield {
      actionWorkflow,
      actionRunDataGenerator: mapIter(
        (el) => ({ run: el } as ActionRunData),
        filterIter((el: GithubActionRun) => {
          if (signal?.aborted) {
            throw new AbortError()
          }

          if (
            daysBetween(new Date(el.created_at), new Date(latestWorkflowSync.updatedAt!)) >
              (actionRun?.maxDays || Infinity)
          ) {
            return false
          }

          return true
        }, gh.findActionRuns({ path: actionWorkflow.path, branch: actionRun?.branch })),
      ),
    }
  }
}
