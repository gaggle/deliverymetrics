import { Acceptable, exists, Query } from "aloedb"
import { EventEmitter } from "event"
import { join } from "std:path"

import { AloeDatabase } from "../db/mod.ts"
import { hash } from "../utils/mod.ts"

import { AbortError } from "../errors.ts"
import { Epoch } from "../types.ts"

import {
  DBJiraSearchIssue,
  dbJiraSearchIssueSchema,
  DBJiraSearchNames,
  dbJiraSearchNamesSchema,
  fetchJiraSearchIssues,
} from "./api/search/mod.ts"

import { JiraClient } from "./types.ts"
import { JiraSyncInfo, jiraSyncInfoSchema } from "./jira-sync-info-schema.ts"

interface AloeJiraClientDb {
  searchIssues: AloeDatabase<DBJiraSearchIssue>
  searchNames: AloeDatabase<DBJiraSearchNames>
  syncs: AloeDatabase<JiraSyncInfo>
}

type Context = { newerThan?: Epoch; signal?: AbortSignal }

export type JiraClientEvents = {
  "aborted": [{ type: JiraSyncInfo["type"] }]
  "finished": [{ type: JiraSyncInfo["type"] }]
  "progress": [{ type: JiraSyncInfo["type"] }]
  "warning": [{ type: JiraSyncInfo["type"]; category: "rate-limited"; duration: number }]
}

export class AloeDBSyncingJiraClient extends EventEmitter<JiraClientEvents> implements JiraClient {
  private readonly host: string
  private readonly token: string
  private readonly user: string
  protected readonly db: AloeJiraClientDb

  constructor(opts: { db: AloeJiraClientDb; host: string; user: string; token: string }) {
    super()
    this.db = opts.db
    this.host = opts.host
    this.token = opts.token
    this.user = opts.user
  }

  async findLatestSync(
    opts: Partial<{ type: JiraSyncInfo["type"]; includeUnfinished: boolean }> = {},
  ): Promise<JiraSyncInfo | undefined> {
    const args: Query<Acceptable<JiraSyncInfo>> = { type: opts.type, updatedAt: exists() }
    if (opts.includeUnfinished) {
      delete args["updatedAt"]
    }
    const syncs = await this.db.syncs.findMany(args)
    return syncs[syncs.length - 1]
  }

  async syncSearchIssues(
    jql: string,
    opts: Partial<{ newerThan: number; signal: AbortSignal }> = {},
  ): Promise<unknown> {
    const result = await this.internalFetch({
      type: "search",
      iteratorFn: (context) =>
        fetchJiraSearchIssues({
          host: this.host,
          user: this.user,
          token: this.token,
          jql,
          ...context,
        }),
      upsertFn: async (el) => {
        const namesHash = await hash(JSON.stringify(el.names))
        const dbIssue: DBJiraSearchIssue = { ...el.issue, namesHash }
        const dbNames: DBJiraSearchNames = { hash: namesHash, names: el.names }
        await this.db.searchIssues.deleteOne({ key: dbIssue.key })
        await this.db.searchIssues.insertOne(dbIssue)
        const existing = await this.db.searchNames.findOne({ hash: namesHash })
        if (!existing) {
          await this.db.searchNames.insertOne(dbNames)
        }
      },
      saveFn: async () => {
        await Promise.all([this.db.searchIssues.save(), this.db.searchNames.save()])
      },
      ...opts,
    })
    return Promise.resolve({ syncedAt: result.syncInfo.createdAt })
  }

  private async internalFetch<T>(
    opts: {
      iteratorFn: (context: Context) => AsyncGenerator<T>
      type: JiraSyncInfo["type"]
      upsertFn: (el: T, context: Context) => Promise<void>
      saveFn: (context: Context) => Promise<void>
      signal?: AbortSignal
      newerThan?: Epoch
    },
  ): Promise<{ syncInfo: JiraSyncInfo }> {
    let syncMarker = await this.db.syncs.insertOne({ type: opts.type, createdAt: Date.now(), updatedAt: undefined })
    await this.db.syncs.save()

    const context = {
      newerThan: await this.calcNewerThanBasedOnLatestSync({ type: opts.type, max: opts.newerThan }),
      signal: opts.signal,
    }
    try {
      for await (
        const el of opts.iteratorFn(context)
      ) {
        if (opts.signal?.aborted) {
          await this.emit("aborted", { type: opts.type })
          throw new AbortError()
        }
        await opts.upsertFn(el, context)
        await this.emit("progress", { type: opts.type })
      }
    } finally {
      await opts.saveFn(context)
    }
    await this.emit("finished", { type: opts.type })

    syncMarker = await this.db.syncs.updateOne(syncMarker, { ...syncMarker, updatedAt: Date.now() }) as JiraSyncInfo
    await this.db.syncs.save()

    return { syncInfo: syncMarker }
  }

  private async calcNewerThanBasedOnLatestSync(
    opts: { type: JiraSyncInfo["type"]; max?: number },
  ): Promise<number | undefined> {
    const syncInfo = await this.findLatestSync({ type: opts.type })
    if (syncInfo === undefined && opts.max === undefined) {
      // No sync info and no max so there's nothing to calculate
      return
    }
    if (syncInfo && opts.max) {
      // If both are defined return the most recent
      // e.g. if max is Epoch 10 day ago, and latest sync is Epoch 1 day ago, then return latest sync Epoch
      return Math.max(
        syncInfo.createdAt,
        opts.max,
      )
    }
    return syncInfo?.createdAt ?? opts.max
  }
}

export async function getJiraClient(opts: {
  type: "SyncingJiraClient"
  persistenceDir: string
  host: string
  user: string
  token: string
}): Promise<JiraClient> {
  const db: AloeJiraClientDb = {
    syncs: await AloeDatabase.new({
      path: join(opts.persistenceDir, "syncs.json"),
      schema: jiraSyncInfoSchema,
    }),
    searchIssues: await AloeDatabase.new({
      path: join(opts.persistenceDir, "search-issues.json"),
      schema: dbJiraSearchIssueSchema,
    }),
    searchNames: await AloeDatabase.new({
      path: join(opts.persistenceDir, "search-names.json"),
      schema: dbJiraSearchNamesSchema,
    }),
  }
  return new AloeDBSyncingJiraClient({ db, host: opts.host, user: opts.user, token: opts.token })
}
