import { jiraSearchResponseSchema } from "./jira-search-schema.ts"

export const jiraSearchRestApiSpec = {
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
}
