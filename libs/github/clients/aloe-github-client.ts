import { EventEmitter } from "event"
import { debug } from "std:log"
import { Acceptable, exists, Query } from "aloedb"

import { AloeDatabase } from "../../db/mod.ts"
import { arrayToAsyncGenerator, asyncToArray, first } from "../../utils/mod.ts"
import { retrierFactory } from "../../fetching/mod.ts"

import { AbortError } from "../../errors.ts"
import { Epoch } from "../../types.ts"

import { sortActionRunsKey, sortPullCommitsByKey, sortPullsByKey } from "../utils/mod.ts"

import {
  ActionRun,
  ActionWorkflow,
  BoundGithubPullCommit,
  GithubClient,
  GithubClientEvents,
  GithubCommit,
  GithubPull,
  GithubPullCommitDateKey,
  GithubPullDateKey,
  ReadonlyGithubClient,
  Sortable,
  SyncInfo,
} from "../schemas/mod.ts"
import { fetchActionRuns, fetchActionWorkflows, fetchCommits, fetchPullCommits, fetchPulls } from "../fetchers/mod.ts"

interface AloeGithubClientDb {
  actionRuns: AloeDatabase<ActionRun>
  actionWorkflows: AloeDatabase<ActionWorkflow>
  commits: AloeDatabase<GithubCommit>
  pullCommits: AloeDatabase<BoundGithubPullCommit>
  pulls: AloeDatabase<GithubPull>
  syncs: AloeDatabase<SyncInfo>
}

export class ReadonlyAloeGithubClient extends EventEmitter<GithubClientEvents> implements ReadonlyGithubClient {
  readonly repoHtmlUrl: string

  protected readonly db: AloeGithubClientDb

  constructor(opts: { db: AloeGithubClientDb; owner: string; repo: string }) {
    super()
    this.repoHtmlUrl = `https://github.com/${opts.owner}/${opts.repo}`
    this.db = opts.db
  }

  async findLatestSync(
    opts: Partial<{ type: SyncInfo["type"]; includeUnfinished: boolean }> = {},
  ): Promise<SyncInfo | undefined> {
    const args: Query<Acceptable<SyncInfo>> = { type: opts.type, updatedAt: exists() }
    if (opts.includeUnfinished) {
      delete args["updatedAt"]
    }
    const syncs = await this.db.syncs.findMany(args)
    return syncs[syncs.length - 1]
  }

  /**
   * Yield pulls
   *
   * Default sort is by `updated_at`
   */
  async *findPulls(
    { sort }: Partial<{ sort: { key: GithubPullDateKey; order?: "asc" | "desc" } }> = {},
  ): AsyncGenerator<GithubPull> {
    const sortedPulls = sortPullsByKey(
      await this.db.pulls.findMany(),
      sort?.key ?? "updated_at",
    )
    if (sort?.order === "desc") {
      sortedPulls.reverse()
    }
    for (const el of sortedPulls) {
      yield el
    }
  }

  async *findUnclosedPulls(): AsyncGenerator<GithubPull> {
    for (
      const el of (await asyncToArray(this.findPulls())).filter((pull) => pull.state !== "closed")
    ) {
      yield el
    }
  }

  findLatestPull(): Promise<GithubPull | undefined> {
    return first(this.findPulls({ sort: { key: "updated_at", order: "desc" } }))
  }

  async *findPullCommits(
    { sort, pr }: Partial<{ pr: GithubPull["number"] } & Sortable<GithubPullCommitDateKey>> = {},
  ): AsyncGenerator<BoundGithubPullCommit> {
    const sortedPullCommits: BoundGithubPullCommit[] = sortPullCommitsByKey(
      await this.db.pullCommits.findMany(pr ? { pr } : undefined),
      sort?.key ?? "commit.author",
    )
    if (sort?.order === "desc") {
      sortedPullCommits.reverse()
    }
    for (const el of sortedPullCommits) {
      yield el
    }
  }

  findEarliestPullCommit(
    { pr }: Partial<{ pr: GithubPull["number"] }> = {},
  ): Promise<BoundGithubPullCommit | undefined> {
    return first(this.findPullCommits({ pr, sort: { key: "commit.author", order: "asc" } }))
  }

  async *findCommits(): AsyncGenerator<GithubCommit> {
    for (const el of await this.db.commits.findMany()) {
      yield el
    }
  }

  async *findActionRuns(opts: Partial<{
    branch: string | RegExp
    conclusion: string | RegExp
    path: string | RegExp
    sort: { key: "created_at" | "updated_at"; order?: "asc" | "desc" }
  }> = {}): AsyncGenerator<ActionRun> {
    const query: Query<ActionRun> = {}
    if (opts?.branch) query.head_branch = opts.branch
    if (opts?.conclusion) query.conclusion = opts.conclusion
    if (opts?.path) query.path = opts.path
    const runs = await this.db.actionRuns.findMany(query)

    sortActionRunsKey(
      runs,
      opts?.sort?.key ?? "updated_at",
    )

    if (opts?.sort?.order === "desc") {
      runs.reverse()
    }

    for (const el of runs) {
      yield el
    }
  }

  async *findActionWorkflows(): AsyncGenerator<ActionWorkflow> {
    const workflows = await this.db.actionWorkflows.findMany()
    for (const wf of workflows) {
      yield wf
    }
  }
}

export class AloeGithubClient extends ReadonlyAloeGithubClient implements GithubClient {
  private readonly owner: string
  private readonly repo: string
  private readonly token?: string

  constructor(
    opts: {
      db: AloeGithubClientDb
      owner: string
      repo: string
      token?: string
    },
  ) {
    super(opts)
    this.owner = opts.owner
    this.repo = opts.repo
    this.token = opts.token
  }

  async syncPulls(opts: { signal?: AbortSignal; newerThan?: Epoch } = {}): Promise<{
    syncedAt: Epoch
    syncedPulls: Array<GithubPull>
  }> {
    const syncedPulls: Array<GithubPull> = []
    const result = await this.internalFetch({
      type: "pull",
      iteratorFn: (context) => _internals.fetchPulls(this.owner, this.repo, this.token, context),
      upsertFn: async (pull) => {
        await this.db.pulls.deleteOne({ number: pull.number })
        await this.db.pulls.insertOne(pull)
        syncedPulls.push(pull)
      },
      saveFn: () => this.db.pulls.save(),
      ...opts,
    })
    return { syncedAt: result.syncInfo.createdAt, syncedPulls }
  }

  async syncPullCommits(
    pulls: Array<GithubPull>,
    opts: { signal?: AbortSignal } = {},
  ): Promise<{ syncedAt: Epoch }> {
    const result = await this.internalFetch({
      type: "pull-commit",
      iteratorFn: () => arrayToAsyncGenerator(pulls),
      upsertFn: async (pull, context) => {
        const commits = await asyncToArray(
          _internals.fetchPullCommits({ commits_url: pull.commits_url }, this.token, context),
        )
        debug(`Upserting pull commits bound to pr ${pull.number}`)
        await this.db.pullCommits.deleteMany({ pr: pull.number })
        await this.db.pullCommits.insertMany(commits.map((commit) => ({ ...commit, pr: pull.number })))
      },
      saveFn: () => this.db.pullCommits.save(),
      ...opts,
    })

    return { syncedAt: result.syncInfo.createdAt }
  }

  async syncCommits(opts: { signal?: AbortSignal; newerThan?: Epoch } = {}): Promise<{ syncedAt: Epoch }> {
    const result = await this.internalFetch({
      type: "commit",
      iteratorFn: (context) => _internals.fetchCommits(this.owner, this.repo, this.token, context),
      upsertFn: async (commit) => {
        await this.db.commits.deleteOne({ node_id: commit.node_id })
        await this.db.commits.insertOne(commit)
      },
      saveFn: () => this.db.commits.save(),
      ...opts,
    })

    return { syncedAt: result.syncInfo.createdAt }
  }

  async syncActionRuns(opts: { signal?: AbortSignal; newerThan?: Epoch } = {}): Promise<{ syncedAt: Epoch }> {
    const result = await this.internalFetch({
      type: "action-run",
      iteratorFn: (context) => _internals.fetchActionRuns(this.owner, this.repo, this.token, context),
      upsertFn: async (run) => {
        await this.db.actionRuns.deleteOne({ node_id: run.node_id })
        await this.db.actionRuns.insertOne(run)
      },
      saveFn: () => this.db.actionRuns.save(),
      ...opts,
    })

    return { syncedAt: result.syncInfo.createdAt }
  }

  async syncActionWorkflows(opts: { signal?: AbortSignal } = {}): Promise<{ syncedAt: Epoch }> {
    const result = await this.internalFetch({
      type: "action-workflow",
      iteratorFn: (context) => _internals.fetchActionWorkflows(this.owner, this.repo, this.token, context),
      upsertFn: async (workflow) => {
        await this.db.actionWorkflows.deleteOne({ node_id: workflow.node_id })
        await this.db.actionWorkflows.insertOne(workflow)
      },
      saveFn: () => this.db.actionWorkflows.save(),
      ...opts,
    })

    return { syncedAt: result.syncInfo.createdAt }
  }

  private async calcNewerThanBasedOnLatestSync(
    opts: { type: SyncInfo["type"]; max?: number },
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

  private async internalFetch<T>(
    opts: {
      iteratorFn: (context: { fetchLike: typeof fetch; newerThan?: Epoch }) => AsyncGenerator<T>
      type: SyncInfo["type"]
      upsertFn: (el: T, context: { fetchLike: typeof fetch; newerThan?: Epoch }) => Promise<void>
      saveFn: (context: { fetchLike: typeof fetch; newerThan?: Epoch }) => Promise<void>
      signal?: AbortSignal
      newerThan?: Epoch
    },
  ): Promise<{ syncInfo: SyncInfo }> {
    const rateLimitAwareRetrier = retrierFactory({ strategy: "rate-limit-exponential" })
    rateLimitAwareRetrier.on(
      "rate-limited",
      async (args) =>
        await this.emit("warning", { type: opts.type, category: "rate-limited", duration: args.duration }),
    )

    let syncMarker = await this.db.syncs.insertOne({ type: opts.type, createdAt: Date.now(), updatedAt: undefined })
    await this.db.syncs.save()

    const context = {
      fetchLike: rateLimitAwareRetrier.fetch.bind(rateLimitAwareRetrier),
      newerThan: await this.calcNewerThanBasedOnLatestSync({ type: opts.type, max: opts.newerThan }),
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

    syncMarker = await this.db.syncs.updateOne(syncMarker, { ...syncMarker, updatedAt: Date.now() }) as SyncInfo
    await this.db.syncs.save()

    return { syncInfo: syncMarker }
  }
}

export const _internals = {
  fetchCommits,
  fetchPullCommits,
  fetchPulls,
  fetchActionRuns,
  fetchActionWorkflows,
} as const
