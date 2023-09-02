import { AbortError, daysBetween, filterIter, mapIter } from "../../utils/mod.ts"

import { GithubActionRun } from "../github/api/action-run/mod.ts"
import { ReadonlyGithubClient } from "../github/mod.ts"

import { YieldActionWorkflowData } from "./types.ts"

export async function* yieldActionData(
  gh: ReadonlyGithubClient,
  { actionRun, signal }: Partial<{ actionRun: { maxDays?: number; branch?: string }; signal: AbortSignal }> = {},
): AsyncGenerator<YieldActionWorkflowData> {
  const latestWorkflowSync = await gh.findLatestSync({ type: "action-workflow" })
  if (!latestWorkflowSync) return

  for await (const actionWorkflow of gh.findActionWorkflows()) {
    if (signal?.aborted) {
      throw new AbortError()
    }

    const filter_run_is_recent: (el: GithubActionRun) => boolean = (el) => {
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
    }

    yield {
      actionWorkflow,
      actionRunDataGenerator: mapIter(
        (el) => ({
          run: el,
          duration: getActionRunDuration(el),
        }),
        filterIter(
          filter_run_is_recent,
          gh.findActionRuns({ path: actionWorkflow.path, branch: actionRun?.branch }),
        ),
      ),
    }
  }
}

export function getActionRunDuration(el: GithubActionRun): number | undefined {
  if (!el.run_started_at) return
  return new Date(el.updated_at).getTime() - new Date(el.run_started_at).getTime()
}
