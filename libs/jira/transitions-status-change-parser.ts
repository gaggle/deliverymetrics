import { toISOStringWithoutMs } from "../../utils/mod.ts"
import { Epoch } from "../../utils/types.ts"

import { ExtractedStateTransition } from "../metrics/jira-transition-data.ts"

export function transitionsStatusChangeParser(
  transitions: Array<ExtractedStateTransition>,
  { plannedStates, inProgressStates, completedStates }: {
    plannedStates: string[]
    inProgressStates: string[]
    completedStates: string[]
  },
): { planned?: Epoch; inProgress?: Epoch; completed?: Epoch; eventLog: string[] } {
  const eventLog: string[] = []
  const result: Partial<{ planned: Epoch; inProgress: Epoch; completed: Epoch }> = {}
  const forbiddenStateTransitions = {
    planned: ["inProgress", "completed"],
    inProgress: ["completed"],
    completed: [],
  } as const

  const logTransition = (state: string, transition: ExtractedStateTransition) => {
    eventLog.push(
      `Transitioned to ${state} state at ${
        toISOStringWithoutMs(transition.created)
      } with status '${transition.toString}'`,
    )
  }
  const logCantGoBack = (state: string, transition: ExtractedStateTransition, pastState: string) => {
    eventLog.push(
      `Ignored transition to ${state} state at ${
        toISOStringWithoutMs(transition.created)
      }, as state has already been ${pastState} (status changed to '${transition.toString}')`,
    )
  }
  const logStateStill = (state: string, transition: ExtractedStateTransition) => {
    eventLog.push(
      `State still ${state} at ${
        toISOStringWithoutMs(transition.created)
      } (status changed to '${transition.toString}')`,
    )
  }

  const handleTransition = (
    stateLabel: "planned" | "inProgress" | "completed",
    transition: ExtractedStateTransition,
  ) => {
    const existingResult = result[stateLabel]
    const forbiddenTransitionResult = forbiddenStateTransitions[stateLabel].find((state) => result[state] !== undefined)

    if (existingResult === undefined && forbiddenTransitionResult === undefined) {
      result[stateLabel] = transition.created
      logTransition(stateLabel, transition)
    } else if (existingResult !== undefined) {
      logStateStill(stateLabel, transition)
    } else if (forbiddenTransitionResult !== undefined) {
      logCantGoBack(stateLabel, transition, forbiddenTransitionResult)
    } else {
      throw new Error("unreachable")
    }
  }

  for (
    const transition of transitions
      .sort((a, b) => a.created - b.created)
      .filter((el) => el.type === "status-fieldId")
  ) {
    if (plannedStates.includes(transition.toString!)) handleTransition("planned", transition)
    if (inProgressStates.includes(transition.toString!)) handleTransition("inProgress", transition)
    if (completedStates.includes(transition.toString!)) handleTransition("completed", transition)
  }

  return { ...result, eventLog }
}
