import { z } from "zod"

import { jiraSearchResponseSchema } from "./search/jira-search-schema.ts"

export const jiraRestSpec = {
  /**
   * https://docs.atlassian.com/software/jira/docs/api/REST/1000.919.0/#api/2/search
   */
  search: {
    getReq: (host: string, user: string, token: string, query: string, opts: Partial<{
      startAt: number
      maxResults: number
    }> = {}): Request => {
      const uri = new URL(`${new URL(host).toString()}rest/api/2/search`)
      const payload = {
        jql: query,
        startAt: opts.startAt,
        maxResults: opts.maxResults,
        expand: ["body", "changelog", "history", "names", "transitions"],
      }
      const headers: HeadersInit = {
        "content-type": "application/json",
        "authorization": `Basic ${btoa(`${user}:${token}`)}`,
      }
      return new Request(uri.toString(), {
        body: JSON.stringify(payload),
        headers,
        method: "POST",
      })
    },
    schema: jiraSearchResponseSchema,
  },
} as const

export interface JiraRestSpec {
  search: {
    Schema: z.infer<typeof jiraRestSpec.search.schema>
  }
}
