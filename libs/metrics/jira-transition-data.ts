import { Epoch } from "../../utils/types.ts"

import { JiraSearchIssue, JiraSearchIssueChangelogHistoryItem } from "../jira/api/search/mod.ts"

export type ExtractedStateTransition = {
  type: string
  created: Epoch
  duration?: number
  // ↑ This holds the time interval in milliseconds between successive transitions
  //   Note: Duration is calculated *between transitions of the same field*,
  //   so the same field changing forms "transition chains".
  //   If there was no previous transition of the same field the duration is undefined.
  displayName?: string
  emailAddress?: string
  from: string | null
  fromString: string | null
  to: string | null
  // deno-lint-ignore no-explicit-any
  toString: any | string | null
  // ↑ This is supposed to be `string | null`,
  //   but actually Typescript gets confused over the `toString` field-name
  //   because it conflicts with built-in toString method.
  //   It causes the type to include the built-in method's type (string | ()=>string).
}

export async function* yieldJiraTransitionData(
  yieldJiraSearchIssues: AsyncGenerator<JiraSearchIssue>,
): AsyncGenerator<ExtractedStateTransition> {
  for await (const jiraSearchIssue of yieldJiraSearchIssues) {
    for await (const stateTransition of extractStateTransitions(jiraSearchIssue)) {
      yield stateTransition
    }
  }
}

export async function* extractStateTransitions(
  jiraSearchIssue: JiraSearchIssue,
): AsyncGenerator<ExtractedStateTransition> {
  const historiesFromOldestToNewest = jiraSearchIssue.changelog?.histories?.toReversed() || []

  const prevByField: Record<string, number> = {}

  for (const history of historiesFromOldestToNewest) {
    for (const historyItem of history.items || []) {
      const transitionType = getTransitionType(historyItem)
      if (!transitionType) continue
      const field = historyItem.field

      const created = new Date(history.created!).getTime()
      const prevCreated = field ? prevByField[field] : undefined
      const duration = prevCreated === undefined ? undefined : created - prevCreated

      yield {
        created: created,
        displayName: history.author!.displayName,
        emailAddress: history.author!.emailAddress,
        from: historyItem.from || null,
        fromString: historyItem.fromString || null,
        to: historyItem.to || null,
        toString: historyItem.toString || null,
        type: transitionType,
        ...(duration !== undefined && { duration }),
      }

      if (field) prevByField[field] = created
    }
  }
}

function getTransitionType(
  item: JiraSearchIssueChangelogHistoryItem,
): string | undefined {
  if (item.from && item.to && item.from === item.to) return undefined
  if (item.field === "Key") return "Key-field"
  if (item.fieldId === "resolution") return "resolution-fieldId"
  if (item.fieldId === "status") return "status-fieldId"
  return
}
