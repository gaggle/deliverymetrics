import { EventEmitter } from "event"

import { JiraSyncInfo } from "./jira-sync-info-schema.ts"
import { JiraSearchIssue, JiraSearchNames } from "./api/search/jira-search-schema.ts"

export type JiraClientEvents = {
  "aborted": [{ type: JiraSyncInfo["type"] }]
  "finished": [{ type: JiraSyncInfo["type"] }]
  "progress": [{ type: JiraSyncInfo["type"] }]
  "warning": [{ type: JiraSyncInfo["type"]; category: "rate-limited"; duration: number }]
}

export interface ReadonlyJiraClient extends EventEmitter<JiraClientEvents> {
  findSearchIssues(): AsyncGenerator<{ issue: JiraSearchIssue; names: JiraSearchNames }>
}

export interface JiraClient extends ReadonlyJiraClient {
  syncSearchIssues(jql: string, opts?: Partial<{ newerThan: number; signal: AbortSignal }>): Promise<unknown>
}
