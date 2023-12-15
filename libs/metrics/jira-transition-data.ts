import { asyncToArray } from "../../utils/mod.ts"
import { Epoch } from "../../utils/types.ts"

import { JiraSearchIssue, JiraSearchIssueChangelogHistoryItem } from "../jira/api/search/mod.ts"

export type JiraTransitionData = ExtractedStateTransition & { issue: JiraSearchIssue }

export async function* yieldJiraTransitionData(
  yieldJiraSearchIssues: AsyncGenerator<JiraSearchIssue>,
): AsyncGenerator<JiraTransitionData> {
  for await (const jiraSearchIssue of yieldJiraSearchIssues) {
    for (const stateTransition of (await asyncToArray(extractStateTransitions(jiraSearchIssue))).reverse()) {
      yield { ...stateTransition, issue: jiraSearchIssue }
    }
  }
}

export type ExtractedStateTransition = {
  type: string
  created: Epoch
  displayName?: string
  emailAddress?: string
  from: string | null
  fromString: string | null
  to: string | null
  // deno-lint-ignore no-explicit-any
  toString: any | string | null
  // ↑ This is supposed to be `string | null`,
  // but actually Typescript gets confused over the `toString` field-name
  // because it conflicts with built-in toString method.
  // It causes the type to include the built-in method's type (string | ()=>string).
}

export async function* extractStateTransitions(
  jiraSearchIssue: JiraSearchIssue,
): AsyncGenerator<ExtractedStateTransition> {
  for (const history of jiraSearchIssue.changelog?.histories || []) {
    for (const historyItem of history.items || []) {
      const transitionType = getTransitionType(historyItem)

      if (!transitionType) continue

      yield {
        type: transitionType,
        created: new Date(history.created!).getTime(),
        displayName: history.author!.displayName,
        emailAddress: history.author!.emailAddress,
        from: historyItem.from || null,
        fromString: historyItem.fromString || null,
        to: historyItem.to || null,
        toString: historyItem.toString || null,
      }
    }
  }
}

function getTransitionType(
  item: JiraSearchIssueChangelogHistoryItem,
): string | undefined {
  if (item.from && item.to && item.from === item.to) return undefined
  if (item.field === "Key") return "key-change"
  if (item.fieldId === "resolution") return "resolved"
  if (item.fieldId === "status") return "status-change"
  return
}
