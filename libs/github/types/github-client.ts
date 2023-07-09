import { EventEmitter } from "event"

import { Epoch } from "../../types.ts"

import { GithubActionRun } from "../api/action-run/github-action-run-schema.ts"
import { GithubActionWorkflow } from "../api/action-workflows/github-action-workflow-schema.ts"
import { BoundGithubPullCommit, GithubPullCommitDateKey } from "../api/pull-commits/github-pull-commit-schema.ts"
import { GithubCommit } from "../api/commits/github-commit-schema.ts"
import { GithubPull, GithubPullDateKey } from "../api/pulls/github-pull-schema.ts"
import { SyncInfo } from "./sync-info-schema.ts"
import { GithubRelease } from "../api/releases/github-release-schema.ts"

export type GithubClientEvents = {
  "aborted": [{ type: SyncInfo["type"] }]
  "finished": [{ type: SyncInfo["type"] }]
  "progress": [{ type: SyncInfo["type"] }]
  "warning": [{ type: SyncInfo["type"]; category: "rate-limited"; duration: number }]
}

export interface ReadonlyGithubClient extends EventEmitter<GithubClientEvents> {
  repoHtmlUrl: string

  findLatestSync(opts?: Partial<{ type: SyncInfo["type"]; includeUnfinished: boolean }>): Promise<SyncInfo | undefined>

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

  findCommits(): AsyncGenerator<GithubCommit>

  findPullCommits(
    opts?: Partial<{ pr: GithubPull["number"] } & Sortable<GithubPullCommitDateKey>>,
  ): AsyncGenerator<BoundGithubPullCommit>

  findEarliestPullCommit(opts?: Partial<{ pr: GithubPull["number"] }>): Promise<BoundGithubPullCommit | undefined>

  findPulls(opts?: Sortable<GithubPullDateKey>): AsyncGenerator<GithubPull>

  findUnclosedPulls(): AsyncGenerator<GithubPull>

  findLatestPull(): Promise<GithubPull | undefined>

  findReleases(): AsyncGenerator<GithubRelease>
}

export interface GithubClient extends ReadonlyGithubClient {
  syncActionRuns(opts?: { signal?: AbortSignal; newerThan?: Epoch }): Promise<{ syncedAt: Epoch }>

  syncActionWorkflows(opts?: { signal?: AbortSignal }): Promise<{ syncedAt: Epoch }>

  syncCommits(opts?: { signal?: AbortSignal; newerThan?: Epoch }): Promise<{ syncedAt: Epoch }>

  syncPullCommits(pulls: Array<GithubPull>, opts?: { signal?: AbortSignal }): Promise<{ syncedAt: Epoch }>

  syncPulls(
    opts?: { signal?: AbortSignal; newerThan?: Epoch },
  ): Promise<{ syncedAt: Epoch; syncedPulls: Array<GithubPull> }>

  syncReleases(opts?: { signal?: AbortSignal; newerThan?: Epoch }): Promise<{ syncedAt: Epoch }>

  syncStatsCodeFrequency(opts?: { signal?: AbortSignal }): Promise<{ syncedAt: Epoch }>

  syncStatsCommitActivity(opts?: { signal?: AbortSignal }): Promise<{ syncedAt: Epoch }>

  syncStatsContributors(opts?: { signal?: AbortSignal }): Promise<{ syncedAt: Epoch }>

  syncStatsParticipation(opts?: { signal?: AbortSignal }): Promise<{ syncedAt: Epoch }>

  syncStatsPunchCard(opts?: { signal?: AbortSignal }): Promise<{ syncedAt: Epoch }>
}

export type Sortable<T> = Partial<{ sort: { key: T; order?: "asc" | "desc" } }>
