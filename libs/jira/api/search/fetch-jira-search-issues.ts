import { debug } from "std:log"

import { AbortError } from "../../../../utils/errors.ts"
import { Epoch } from "../../../../utils/types.ts"

import { fetchJiraApiExhaustively } from "../fetch-jira-api-exhaustively.ts"

import { jiraSearchRestApiSpec } from "./jira-search-rest-api-spec.ts"
import { JiraSearchIssue, JiraSearchNames } from "./jira-search-schema.ts"

export async function* fetchJiraSearchIssues(
  { host, user, token, projectKeys, newerThan, signal }: {
    host: string
    user: string
    token: string
    projectKeys: string[]
    newerThan?: Epoch
    signal?: AbortSignal
  },
): AsyncGenerator<{ issue: JiraSearchIssue; names: JiraSearchNames }> {
  const jql = `project in (${projectKeys.join(", ")}) ORDER BY updated desc`
  for await (
    const { data } of _internals.fetchJiraApiExhaustively(
      (startAt) => jiraSearchRestApiSpec.getReq(host, user, token, jql, { startAt }),
      jiraSearchRestApiSpec.schema,
      {
        paginationCallback: ({ data }) => {
          if (!data.startAt || !data.maxResults) return undefined
          return jiraSearchRestApiSpec.getReq(host, user, token, jql, { startAt: data.startAt + data.maxResults })
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
