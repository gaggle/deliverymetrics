import { EventEmitter } from "event"

import { Epoch } from "../../types.ts"

import { GithubActionRun } from "../api/action-run/github-action-run-schema.ts"
import { GithubActionWorkflow } from "../api/action-workflows/github-action-workflow-schema.ts"
import { BoundGithubPullCommit, GithubPullCommitDateKey } from "../api/pull-commits/github-pull-commit-schema.ts"
import { GithubCommit } from "../api/commits/github-commit-schema.ts"
import { GithubPull, GithubPullDateKey } from "../api/pulls/github-pull-schema.ts"
import { SyncInfo } from "./sync-info-schema.ts"

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
  ): AsyncGenerator<GithubActionRun>

  findActionWorkflows(): AsyncGenerator<GithubActionWorkflow>
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
