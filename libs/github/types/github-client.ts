import { EventEmitter } from "event"

import { Epoch } from "../../types.ts"

import { ActionRun } from "./github-action-run.ts"
import { ActionWorkflow } from "./github-action-workflow.ts"
import { BoundGithubPullCommit, GithubPullCommitDateKey } from "./github-pull-commit.ts"
import { GithubCommit } from "./github-commit.ts"
import { GithubPull, GithubPullDateKey } from "./github-pull.ts"
import { SyncInfo } from "./sync-info.ts"

export type GithubClientEvents = {
  "aborted": [
    { type: "pull" | "pull-commit" | "commit" | "action-run" | "action-workflow" },
  ]
  "finished": [
    { type: "pull" | "pull-commit" | "commit" | "action-run" | "action-workflow" },
  ]
  "progress": [
    { type: "pull" | "pull-commit" | "commit" | "action-run" | "action-workflow" },
  ]
  "warning": [
    {
      type: "pull" | "pull-commit" | "commit" | "action-run" | "action-workflow"
      category: "rate-limited"
      duration: number
    },
  ]
}

export interface ReadonlyGithubClient extends EventEmitter<GithubClientEvents> {
  repoHtmlUrl: string

  findLatestSync(opts?: Partial<{ type: SyncInfo["type"]; includeUnfinished: boolean }>): Promise<SyncInfo | undefined>

  findPulls(opts?: Sortable<GithubPullDateKey>): AsyncGenerator<GithubPull>

  findUnclosedPulls(): AsyncGenerator<GithubPull>

  findLatestPull(): Promise<GithubPull | undefined>

  findPullCommits(
    opts?: Partial<{ pr: GithubPull["number"] } & Sortable<GithubPullCommitDateKey>>,
  ): AsyncGenerator<BoundGithubPullCommit>

  findEarliestPullCommit(opts?: Partial<{ pr: GithubPull["number"] }>): Promise<BoundGithubPullCommit | undefined>

  findCommits(): AsyncGenerator<GithubCommit>

  findActionRuns(
    opts?:
      & Partial<{
        branch: string | RegExp
        conclusion: string | RegExp
        path: string | RegExp
      }>
      & Sortable<"created_at" | "updated_at">,
  ): AsyncGenerator<ActionRun>

  findActionWorkflows(): AsyncGenerator<ActionWorkflow>
}

export interface GithubClient extends ReadonlyGithubClient {
  syncPulls(
    opts?: { signal?: AbortSignal; newerThan?: Epoch },
  ): Promise<{
    syncedAt: Epoch
    syncedPulls: Array<GithubPull>
  }>

  syncPullCommits(pulls: Array<GithubPull>, opts?: { signal?: AbortSignal }): Promise<{ syncedAt: Epoch }>

  syncCommits(opts?: { signal?: AbortSignal; newerThan?: Epoch }): Promise<{ syncedAt: Epoch }>

  syncActionRuns(opts?: { signal?: AbortSignal; newerThan?: Epoch }): Promise<{ syncedAt: Epoch }>

  syncActionWorkflows(opts?: { signal?: AbortSignal }): Promise<{ syncedAt: Epoch }>
}

export type Sortable<T> = Partial<{ sort: { key: T; order?: "asc" | "desc" } }>
