import { Acceptable, exists, Query } from "aloedb"
import { EventEmitter } from "event"
import { join } from "std:path"

import { AloeDatabase } from "../db/mod.ts"
import { hash, sortObject } from "../utils/mod.ts"

import { AbortError } from "../errors.ts"
import { Epoch } from "../types.ts"

import {
  DBJiraSearchIssue,
  dbJiraSearchIssueSchema,
  DBJiraSearchNames,
  dbJiraSearchNamesSchema,
  fetchJiraSearchIssues,
} from "./api/search/mod.ts"

import { JiraClient, JiraClientEvents, ReadonlyJiraClient } from "./types.ts"
import { JiraSyncInfo, jiraSyncInfoSchema } from "./jira-sync-info-schema.ts"
import { debug } from "std:log"

interface AloeJiraClientDb {
  searchIssues: AloeDatabase<DBJiraSearchIssue>
  searchNames: AloeDatabase<DBJiraSearchNames>
  syncs: AloeDatabase<JiraSyncInfo>
}

type Context = { newerThan?: Epoch; signal?: AbortSignal }

export class AloeDBReadonlyJiraClient extends EventEmitter<JiraClientEvents> implements ReadonlyJiraClient {
  protected readonly db: AloeJiraClientDb

  constructor(opts: { db: AloeJiraClientDb }) {
    super()
    this.db = opts.db
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

  async *findSearchIssues(): AsyncGenerator<DBJiraSearchIssue> {
    for (const el of await this.db.searchIssues.findMany()) {
      const dbNames = await this.db.searchNames.findOne({ hash: el.namesHash })
      if (dbNames === null) throw new Error("...")
      yield el
    }
  }

  async *findSearchNames(): AsyncGenerator<DBJiraSearchNames> {
    for (const el of await this.db.searchNames.findMany()) {
      yield el
    }
  }

  async findSearchNameByHash(hash: string): Promise<DBJiraSearchNames | undefined> {
    return await this.db.searchNames.findOne({ hash }) || undefined
  }
}

export class AloeDBSyncingJiraClient extends AloeDBReadonlyJiraClient implements JiraClient {
  private readonly host: string
  private readonly token: string
  private readonly user: string

  constructor(opts: { db: AloeJiraClientDb; host: string; user: string; token: string }) {
    super(opts)
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
    projectKey: string,
    opts: Partial<{ syncSubtasks?: boolean; newerThan?: number; signal?: AbortSignal }> = {},
  ): Promise<{ syncedAt: Epoch }> {
    const result = await this.internalFetch({
      type: "search",
      iteratorFn: (context) =>
        fetchJiraSearchIssues({
          host: this.host,
          user: this.user,
          token: this.token,
          projectKeys: [projectKey],
          ...context,
        }),
      upsertFn: async ({ issue, names, ...rest }) => {
        const sortedNames = sortObject(names)
        const namesHash = await hash(JSON.stringify(sortedNames))

        await this.db.searchIssues.deleteOne({ issueId: issue.id })
        await this.db.searchIssues.insertOne({ issueId: issue.id, issueKey: issue.key, issue: issue, namesHash })

        const existingNames = await this.db.searchNames.findOne({ hash: namesHash })
        if (!existingNames) {
          const dbNames: DBJiraSearchNames = { hash: namesHash, names: sortedNames }
          await this.db.searchNames.insertOne(dbNames)
        }

        if (Object.keys(rest).length > 0) {
          debug(`not storing: ${JSON.stringify(rest)}`)
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

type GetSyncingJiraClientOpts = {
  type: "SyncingJiraClient"
  persistenceDir: string
  host: string
  user: string
  token: string
}

type GetReadonlyJiraClientOpts = {
  type: "ReadonlyJiraClient"
  persistenceDir: string
  host?: never
  user?: never
  token?: never
}

export async function getJiraClient(
  opts: GetSyncingJiraClientOpts,
): Promise<JiraClient>
export async function getJiraClient(
  opts: GetReadonlyJiraClientOpts,
): Promise<ReadonlyJiraClient>
export async function getJiraClient(
  opts: GetSyncingJiraClientOpts | GetReadonlyJiraClientOpts,
): Promise<JiraClient | ReadonlyJiraClient> {
  const db: AloeJiraClientDb = {
    searchIssues: await AloeDatabase.new({
      path: join(opts.persistenceDir, "search-issues.json"),
      schema: dbJiraSearchIssueSchema,
    }),
    searchNames: await AloeDatabase.new({
      path: join(opts.persistenceDir, "search-names.json"),
      schema: dbJiraSearchNamesSchema,
    }),
    syncs: await AloeDatabase.new({
      path: join(opts.persistenceDir, "syncs.json"),
      schema: jiraSyncInfoSchema,
    }),
  }
  return opts.type === "ReadonlyJiraClient"
    ? new AloeDBReadonlyJiraClient({ db })
    : new AloeDBSyncingJiraClient({ db, host: opts.host, user: opts.user, token: opts.token })
}
