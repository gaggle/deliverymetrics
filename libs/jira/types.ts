import { EventEmitter } from "event"

import { Epoch } from "../../utils/types.ts"

import { DBJiraSearchIssue, DBJiraSearchNames } from "./api/search/mod.ts"

import { JiraSyncInfo } from "./jira-sync-info-schema.ts"

export type JiraClientEvents = {
  "aborted": [{ type: JiraSyncInfo["type"] }]
  "finished": [{ type: JiraSyncInfo["type"] }]
  "progress": [{ type: JiraSyncInfo["type"] }]
  "warning": [{ type: JiraSyncInfo["type"]; category: "rate-limited"; duration: number }]
}

export interface ReadonlyJiraClient extends EventEmitter<JiraClientEvents> {
  findLatestSync(
    opts?: Partial<{ type: JiraSyncInfo["type"]; includeUnfinished: boolean }>,
  ): Promise<JiraSyncInfo | undefined>

  findSearchIssues(): AsyncGenerator<DBJiraSearchIssue>

  findSearchNames(): AsyncGenerator<DBJiraSearchNames>

  findSearchNameByHash(hash: string): Promise<DBJiraSearchNames | undefined>
}

export interface JiraClient extends ReadonlyJiraClient {
  syncSearchIssues(
    projectKey: string,
    opts?: Partial<{
      syncSubtasks?: boolean
      newerThan?: number
      signal?: AbortSignal
    }>,
  ): Promise<{ syncedAt: Epoch }>

  pruneSearchIssues(newerThan: Epoch): Promise<{ prunedCount: number }>
}
