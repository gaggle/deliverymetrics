import { debug } from "std:log"
import { equal } from "equal"
import { exists, Query } from "aloedb"
import { groupBy } from "std:group-by"

import { AloeDatabase } from "../../db/mod.ts"

import { asyncToArray, first } from "../../utils/mod.ts"

import { fetchActionRuns } from "../utils/fetch-action-runs.ts"
import { fetchActionWorkflows } from "../utils/fetch-action-workflows.ts"
import { fetchCommits } from "../utils/fetch-commits.ts"
import { fetchPullCommits } from "../utils/fetch-pull-commits.ts"
import { fetchPulls } from "../utils/fetch-pulls.ts"
import { sortActionRunsKey, sortPullCommitsByKey, sortPullsByKey } from "../utils/sorting.ts"

import {
  ActionRun,
  ActionWorkflow,
  BoundGithubPullCommit,
  GithubClient,
  GithubCommit,
  GithubDiff,
  GithubPull,
  GithubPullCommitDateKey,
  GithubPullDateKey,
  ReadonlyGithubClient,
  Sortable,
  SyncInfo,
  SyncProgressParams,
} from "../types/mod.ts"

interface AloeGithubClientDb {
  actionRuns: AloeDatabase<ActionRun>
  actionWorkflows: AloeDatabase<ActionWorkflow>
  commits: AloeDatabase<GithubCommit>
  pullCommits: AloeDatabase<BoundGithubPullCommit>
  pulls: AloeDatabase<GithubPull>
  syncs: AloeDatabase<SyncInfo>
}

export class ReadonlyAloeGithubClient implements ReadonlyGithubClient {
  readonly repoHtmlUrl: string

  protected readonly db: AloeGithubClientDb

  constructor(opts: { db: AloeGithubClientDb; owner: string; repo: string }) {
    this.repoHtmlUrl = `https://github.com/${opts.owner}/${opts.repo}`
    this.db = opts.db
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

  async findLatestSync(): Promise<SyncInfo | undefined> {
    const syncs = await this.db.syncs.findMany({ updatedAt: exists() })
    return syncs[syncs.length - 1]
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
  private readonly token: string

  constructor(
    opts: {
      db: AloeGithubClientDb
      owner: string
      repo: string
      token: string
    },
  ) {
    super(opts)
    this.owner = opts.owner
    this.repo = opts.repo
    this.token = opts.token
  }

  async sync(
    opts: Partial<{ syncFromIfUnsynced: number; progress: (type: SyncProgressParams) => void }> = {},
  ): Promise<GithubDiff> {
    const { progress, syncFromIfUnsynced } = { progress: () => {}, ...opts }

    const lastSync = await this.findLatestSync()
    const from = lastSync?.updatedAt || syncFromIfUnsynced

    let sync: SyncInfo = await this.db.syncs.insertOne({
      createdAt: Date.now(),
      updatedAt: undefined,
    })
    await this.db.syncs.save()

    const prevPullsByNumber = (await asyncToArray(this.findPulls()))
      .reduce(function (acc, curr) {
        acc[curr.number] = curr
        return acc
      }, {} as Record<number, GithubPull>)

    const fetchedPulls: Array<GithubPull> = []

    const handleCommits = async () => {
      for await (
        const commit of _internals.fetchCommits(this.owner, this.repo, this.token, { from })
      ) {
        await this.db.commits.deleteOne({ node_id: commit.node_id })
        await this.db.commits.insertOne(commit)
        await progress({ type: "commit", commit })
      }
      await this.db.commits.save()
    }

    const handlePulls = async () => {
      for await (
        const pull of _internals.fetchPulls(this.owner, this.repo, this.token, { from })
      ) {
        fetchedPulls.push(pull)
        await this.db.pulls.deleteOne({ number: pull.number })
        await this.db.pulls.insertOne(pull)
        await progress({ type: "pull", pull })
      }
      await this.db.pulls.save()
    }

    const handlePullCommits = async () => {
      for (const pull of fetchedPulls) {
        const commits = await asyncToArray(_internals.fetchPullCommits({ commits_url: pull.commits_url }, this.token))
        await this.db.pullCommits.deleteMany({ pr: pull.number })
        debug(`Deleted pull commits bound to pr ${pull.number}`)
        await this.db.pullCommits.insertMany(commits.map((commit) => ({ ...commit, pr: pull.number })))
        await progress({
          type: "pull-commits",
          commits,
          pr: pull.number,
        })
      }
      await this.db.pullCommits.save()
    }

    const handleActionWorkflows = async () => {
      for await (const workflow of _internals.fetchActionWorkflows(this.owner, this.repo, this.token)) {
        const current = await this.db.actionWorkflows.findOne({ node_id: workflow.node_id })
        await progress({ type: "actions-workflow", workflow })
        if (JSON.stringify(current) !== JSON.stringify(workflow)) {
          await this.db.actionWorkflows.deleteOne({ node_id: workflow.node_id })
          await this.db.actionWorkflows.insertOne(workflow)
        }
      }
      await this.db.actionWorkflows.save()
    }

    const handleActionRuns = async () => {
      for await (
        const run of _internals.fetchActionRuns(this.owner, this.repo, this.token, { from })
      ) {
        await this.db.actionRuns.deleteOne({ node_id: run.node_id })
        await this.db.actionRuns.insertOne(run)
        await progress({ type: "actions-run", run })
      }
      await this.db.actionRuns.save()
    }

    await Promise.all([
      handleCommits(),
      handlePulls().then(() => handlePullCommits()),
      handleActionWorkflows(),
      handleActionRuns(),
    ])

    sync = await this.db.syncs.updateOne(sync, {
      ...sync,
      updatedAt: Date.now(),
    }) as SyncInfo
    await this.db.syncs.save()

    const bucket = groupBy(
      fetchedPulls,
      (pull) => pull.number in prevPullsByNumber ? "updatedPulls" : "newPulls",
    )

    return {
      syncedAt: sync.createdAt,
      newPulls: sortPullsByKey(bucket.newPulls || []),
      updatedPulls: sortPullsByKey(bucket.updatedPulls || [])
        .map((updated) => ({ prev: prevPullsByNumber[updated.number], updated }))
        .filter((el) => !equal(el.prev, el.updated)),
    }
  }
}

export const _internals = {
  fetchCommits,
  fetchPullCommits,
  fetchPulls,
  fetchActionRuns,
  fetchActionWorkflows,
} as const
