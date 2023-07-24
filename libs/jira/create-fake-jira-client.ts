import { MockAloeDatabase } from "../db/mod.ts"

import {
  DBJiraSearchIssue,
  dbJiraSearchIssueSchema,
  DBJiraSearchNames,
  dbJiraSearchNamesSchema,
} from "./api/search/mod.ts"

import { AloeDBReadonlyJiraClient, AloeDBSyncingJiraClient } from "./jira-client.ts"
import { JiraClient, ReadonlyJiraClient } from "./types.ts"
import { JiraSyncInfo, jiraSyncInfoSchema } from "./jira-sync-info-schema.ts"

async function getDb(
  opts: Partial<{
    searchIssues: Array<DBJiraSearchIssue>
    searchNames: Array<DBJiraSearchNames>
    syncs: Array<JiraSyncInfo>
  }> = {},
): Promise<AloeDBSyncingJiraClient["db"] | AloeDBReadonlyJiraClient["db"]> {
  return {
    searchIssues: await MockAloeDatabase.new({
      schema: dbJiraSearchIssueSchema,
      documents: opts.searchIssues,
    }),
    searchNames: await MockAloeDatabase.new({
      schema: dbJiraSearchNamesSchema,
      documents: opts.searchNames,
    }),
    syncs: await MockAloeDatabase.new({
      schema: jiraSyncInfoSchema,
      documents: opts.syncs,
    }),
  }
}

export async function createFakeReadonlyJiraClient(
  opts: Parameters<typeof getDb>[0],
): Promise<ReadonlyJiraClient> {
  return new AloeDBReadonlyJiraClient({ db: await getDb(opts) })
}

export async function createFakeJiraClient(opts: Parameters<typeof getDb>[0] = {}): Promise<JiraClient> {
  return new AloeDBSyncingJiraClient({ host: "host", user: "user", token: "token", db: await getDb(opts) })
}
