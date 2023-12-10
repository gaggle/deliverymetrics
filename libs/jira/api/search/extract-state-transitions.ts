import { assertUnreachable } from "../../../../utils/mod.ts"
import { Epoch } from "../../../../utils/types.ts"

import { JiraSearchIssue, JiraSearchIssueChangelogHistoryItem } from "./jira-search-schema.ts"

export type ExtractedStateTransition = {
  type: "status-change" | "resolved"
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
      if (!isTransitionRelated(historyItem)) continue

      switch (historyItem.fieldId) {
        case "status":
          yield {
            type: "status-change",
            created: new Date(history.created!).getTime(),
            displayName: history.author!.displayName,
            emailAddress: history.author!.emailAddress,
            from: historyItem.from || null,
            fromString: historyItem.fromString || null,
            to: historyItem.to || null,
            toString: historyItem.toString || null,
          }
          break
        case "resolution":
          yield {
            type: "resolved",
            created: new Date(history.created!).getTime(),
            displayName: history.author!.displayName!,
            emailAddress: history.author!.emailAddress!,
            from: historyItem.from!,
            fromString: historyItem.fromString!,
            to: historyItem.to!,
            toString: historyItem.toString!,
          }
          break
        default:
          assertUnreachable(historyItem.fieldId)
      }
    }
  }
}

function isTransitionRelated(
  item: JiraSearchIssueChangelogHistoryItem,
): item is JiraSearchIssueChangelogHistoryItem & { fieldId: "status" | "resolution" } {
  if (item.fieldId === "status") return true
  if (item.fieldId === "resolution") return true
  return false
}
