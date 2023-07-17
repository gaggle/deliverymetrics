import { debug } from "std:log"

import { AbortError } from "../../../errors.ts"
import { Epoch } from "../../../types.ts"

import { fetchJiraApiExhaustively } from "../fetch-jira-api-exhaustively.ts"
import { jiraRestSpec } from "../jira-rest-api-spec.ts"

import { JiraSearchIssue, JiraSearchNames } from "./jira-search-schema.ts"

export async function* fetchJiraSearchIssues(
  { host, user, token, jql, newerThan, signal }: {
    host: string
    user: string
    token: string
    jql: string
    newerThan?: Epoch
    signal?: AbortSignal
  },
): AsyncGenerator<{ issue: JiraSearchIssue; names: JiraSearchNames }> {
  for await (
    const { data } of _internals.fetchJiraApiExhaustively(
      (startAt) => jiraRestSpec.search.getReq(host, user, token, `${jql} ORDER BY updatedDate desc`, { startAt }),
      jiraRestSpec.search.schema,
      {
        paginationCallback: ({ data }) => {
          if (!data.startAt || !data.maxResults) return undefined
          return jiraRestSpec.search.getReq(host, user, token, jql, {
            startAt: data.startAt + data.maxResults,
          })
        },
      },
    )
  ) {
    if (signal?.aborted) {
      throw new AbortError()
    }
    for (const el of data.issues) {
      if (newerThan) {
        const updatedAtDate = new Date(el.fields.updated)
        if (updatedAtDate.getTime() < newerThan) {
          const fromDate = new Date(newerThan)
          debug(`Reached issue not updated since ${fromDate.toLocaleString()}: ${el.key}`)
          return
        }
      }
      yield { issue: el, names: data.names }
    }
  }
}

export const _internals = {
  fetchJiraApiExhaustively,
}
