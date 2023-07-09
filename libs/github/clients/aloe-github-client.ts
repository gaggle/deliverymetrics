import { EventEmitter } from "event"
import { debug } from "std:log"
import { Acceptable, exists, Query } from "aloedb"

import { AloeDatabase } from "../../db/mod.ts"
import { arrayToAsyncGenerator, asyncToArray, firstMaybe } from "../../utils/mod.ts"

import { AbortError } from "../../errors.ts"
import { Epoch } from "../../types.ts"

import { BoundGithubPullCommit, fetchGithubPullCommits, GithubPullCommitDateKey } from "../api/pull-commits/mod.ts"
import { DBCodeFrequency, fetchGithubStatsCodeFrequency } from "../api/stats-code-frequency/mod.ts"
import { DBPunchCard, fetchGithubStatsPunchCard } from "../api/stats-punch-card/mod.ts"
import { GithubCommit } from "../api/commits/mod.ts"
import { fetchGithubActionRuns, GithubActionRun } from "../api/action-run/mod.ts"
import { fetchGithubActionWorkflows, GithubActionWorkflow } from "../api/action-workflows/mod.ts"
import { fetchGithubCommits } from "../api/commits/mod.ts"
import { fetchGithubPulls, GithubPull, GithubPullDateKey } from "../api/pulls/mod.ts"
import { fetchGithubReleases, GithubRelease } from "../api/releases/mod.ts"
import { fetchGithubStatsCommitActivity, GithubStatsCommitActivity } from "../api/stats-commit-activity/mod.ts"
import { fetchGithubStatsContributors, GithubStatsContributor } from "../api/stats-contributors/mod.ts"
import { fetchGithubStatsParticipation, GithubStatsParticipation } from "../api/stats-participation/mod.ts"

import { sortActionRunsKey, sortPullCommitsByKey, sortPullsByKey } from "../github-utils/mod.ts"

import { GithubClient, GithubClientEvents, ReadonlyGithubClient, Sortable, SyncInfo } from "../mod.ts"

interface AloeGithubClientDb {
  actionRuns: AloeDatabase<GithubActionRun>
  actionWorkflows: AloeDatabase<GithubActionWorkflow>
  commits: AloeDatabase<GithubCommit>
  pullCommits: AloeDatabase<BoundGithubPullCommit>
  pulls: AloeDatabase<GithubPull>
  releases: AloeDatabase<GithubRelease>
  statsCodeFrequency: AloeDatabase<DBCodeFrequency>
  statsCommitActivity: AloeDatabase<GithubStatsCommitActivity>
  statsContributors: AloeDatabase<GithubStatsContributor>
  statsParticipation: AloeDatabase<GithubStatsParticipation>
  statsPunchCard: AloeDatabase<DBPunchCard>
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

  async *findActionRuns(opts: Partial<{
    branch: string | RegExp
    conclusion: string | RegExp
    path: string | RegExp
    sort: { key: "created_at" | "updated_at"; order?: "asc" | "desc" }
  }> = {}): AsyncGenerator<GithubActionRun> {
    const query: Query<GithubActionRun> = {}
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

  async *findActionWorkflows(): AsyncGenerator<GithubActionWorkflow> {
    const workflows = await this.db.actionWorkflows.findMany()
    for (const wf of workflows) {
      yield wf
    }
  }

  async *findCommits(): AsyncGenerator<GithubCommit> {
    for (const el of await this.db.commits.findMany()) {
      yield el
    }
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
    return firstMaybe(this.findPullCommits({ pr, sort: { key: "commit.author", order: "asc" } }))
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
    return firstMaybe(this.findPulls({ sort: { key: "updated_at", order: "desc" } }))
  }

  async *findReleases(): AsyncGenerator<GithubRelease> {
    for (const el of await this.db.releases.findMany()) {
      yield el
    }
  }

  async *findStatsCodeFrequencies(): AsyncGenerator<DBCodeFrequency> {
    for (const el of await this.db.statsCodeFrequency.findMany()) {
      yield el
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

  async syncActionRuns(opts: { signal?: AbortSignal; newerThan?: Epoch } = {}): Promise<{ syncedAt: Epoch }> {
    const result = await this.internalFetch({
      type: "action-run",
      iteratorFn: (context) => _internals.fetchGithubActionRuns(this.owner, this.repo, this.token, context),
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
      iteratorFn: () => _internals.fetchGithubActionWorkflows(this.owner, this.repo, this.token),
      upsertFn: async (workflow) => {
        await this.db.actionWorkflows.deleteOne({ node_id: workflow.node_id })
        await this.db.actionWorkflows.insertOne(workflow)
      },
      saveFn: () => this.db.actionWorkflows.save(),
      ...opts,
    })

    return { syncedAt: result.syncInfo.createdAt }
  }

  async syncCommits(opts: { signal?: AbortSignal; newerThan?: Epoch } = {}): Promise<{ syncedAt: Epoch }> {
    const result = await this.internalFetch({
      type: "commit",
      iteratorFn: (context) => _internals.fetchGithubCommits(this.owner, this.repo, this.token, context),
      upsertFn: async (commit) => {
        await this.db.commits.deleteOne({ node_id: commit.node_id })
        await this.db.commits.insertOne(commit)
      },
      saveFn: () => this.db.commits.save(),
      ...opts,
    })

    return { syncedAt: result.syncInfo.createdAt }
  }

  async syncPullCommits(
    pulls: Array<GithubPull>,
    opts: { signal?: AbortSignal } = {},
  ): Promise<{ syncedAt: Epoch }> {
    const result = await this.internalFetch({
      type: "pull-commit",
      iteratorFn: () => arrayToAsyncGenerator(pulls),
      upsertFn: async (pull) => {
        const commits = await asyncToArray(
          _internals.fetchGithubPullCommits({ commits_url: pull.commits_url }, this.token),
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

  async syncPulls(opts: { signal?: AbortSignal; newerThan?: Epoch } = {}): Promise<{
    syncedAt: Epoch
    syncedPulls: Array<GithubPull>
  }> {
    const syncedPulls: Array<GithubPull> = []
    const result = await this.internalFetch({
      type: "pull",
      iteratorFn: (context) => _internals.fetchGithubPulls(this.owner, this.repo, this.token, context),
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

  async syncReleases(opts?: { signal?: AbortSignal; newerThan?: Epoch }): Promise<{ syncedAt: Epoch }> {
    const result = await this.internalFetch({
      type: "release",
      iteratorFn: (context) => _internals.fetchGithubReleases(this.owner, this.repo, this.token, context),
      upsertFn: async (release) => {
        await this.db.releases.deleteOne({ node_id: release.node_id })
        await this.db.releases.insertOne(release)
      },
      saveFn: () => this.db.releases.save(),
      ...opts,
    })
    return Promise.resolve({ syncedAt: result.syncInfo.createdAt })
  }

  async syncStatsCodeFrequency(opts?: { signal?: AbortSignal }): Promise<{ syncedAt: Epoch }> {
    const result = await this.internalFetch({
      type: "stats-code-frequency",
      iteratorFn: () => _internals.fetchGithubStatsCodeFrequency(this.owner, this.repo, this.token),
      upsertFn: async (el) => {
        const [time, additions, deletions] = el
        await this.db.statsCodeFrequency.deleteOne({ time })
        await this.db.statsCodeFrequency.insertOne({
          time,
          timeStr: new Date(time * 1000).toISOString(),
          additions,
          deletions,
        })
      },
      saveFn: () => this.db.statsCodeFrequency.save(),
      ...opts,
    })
    return Promise.resolve({ syncedAt: result.syncInfo.createdAt })
  }

  async syncStatsCommitActivity(opts?: { signal?: AbortSignal }): Promise<{ syncedAt: Epoch }> {
    const result = await this.internalFetch({
      type: "stats-commit-activity",
      iteratorFn: () => _internals.fetchGithubStatsCommitActivity(this.owner, this.repo, this.token),
      upsertFn: async (el) => {
        await this.db.statsCommitActivity.deleteOne({ week: el.week })
        await this.db.statsCommitActivity.insertOne(el)
      },
      saveFn: () => this.db.statsCommitActivity.save(),
      ...opts,
    })
    return Promise.resolve({ syncedAt: result.syncInfo.createdAt })
  }

  async syncStatsContributors(opts?: { signal?: AbortSignal }): Promise<{ syncedAt: Epoch }> {
    const result = await this.internalFetch({
      type: "stats-contributors",
      iteratorFn: () => _internals.fetchGithubStatsContributors(this.owner, this.repo, this.token),
      upsertFn: async (el) => {
        const author = el.author
        await this.db.statsContributors.deleteOne(author === null ? { author: null } : { author: { id: author.id } })
        await this.db.statsContributors.insertOne(el)
      },
      saveFn: () => this.db.statsContributors.save(),
      ...opts,
    })
    return Promise.resolve({ syncedAt: result.syncInfo.createdAt })
  }

  async syncStatsParticipation(opts?: { signal?: AbortSignal }): Promise<{ syncedAt: Epoch }> {
    const result = await this.internalFetch({
      type: "stats-participation",
      iteratorFn: () => _internals.fetchGithubStatsParticipation(this.owner, this.repo, this.token),
      upsertFn: async (el) => {
        await this.db.statsParticipation.deleteOne({ all: exists() })
        await this.db.statsParticipation.insertOne(el)
      },
      saveFn: () => this.db.statsParticipation.save(),
      ...opts,
    })
    return Promise.resolve({ syncedAt: result.syncInfo.createdAt })
  }

  async syncStatsPunchCard(opts?: { signal?: AbortSignal }): Promise<{ syncedAt: Epoch }> {
    const result = await this.internalFetch({
      type: "stats-punch-card",
      iteratorFn: () => _internals.fetchGithubStatsPunchCard(this.owner, this.repo, this.token),
      upsertFn: async (el) => {
        const [day, hour, commits] = el
        await this.db.statsPunchCard.deleteOne({ day, hour })
        await this.db.statsPunchCard.insertOne({ day, hour, commits })
      },
      saveFn: () => this.db.statsPunchCard.save(),
      ...opts,
    })
    return Promise.resolve({ syncedAt: result.syncInfo.createdAt })
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
      iteratorFn: (context: { newerThan?: Epoch }) => AsyncGenerator<T>
      type: SyncInfo["type"]
      upsertFn: (el: T, context: { newerThan?: Epoch }) => Promise<void>
      saveFn: (context: { newerThan?: Epoch }) => Promise<void>
      signal?: AbortSignal
      newerThan?: Epoch
    },
  ): Promise<{ syncInfo: SyncInfo }> {
    let syncMarker = await this.db.syncs.insertOne({ type: opts.type, createdAt: Date.now(), updatedAt: undefined })
    await this.db.syncs.save()

    const context = {
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
  fetchGithubActionRuns,
  fetchGithubActionWorkflows,
  fetchGithubCommits,
  fetchGithubPullCommits,
  fetchGithubPulls,
  fetchGithubReleases,
  fetchGithubStatsCodeFrequency,
  fetchGithubStatsCommitActivity,
  fetchGithubStatsContributors,
  fetchGithubStatsParticipation,
  fetchGithubStatsPunchCard,
} as const
