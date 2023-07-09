import { EventEmitter } from "event"

import { Epoch } from "../../types.ts"

import { BoundGithubPullCommit, GithubPullCommitDateKey } from "../api/pull-commits/mod.ts"
import { DBCodeFrequency } from "../api/stats-code-frequency/mod.ts"
import { DBPunchCardRead } from "../api/stats-punch-card/mod.ts"
import { GithubActionRun } from "../api/action-run/mod.ts"
import { GithubActionWorkflow } from "../api/action-workflows/mod.ts"
import { GithubCommit } from "../api/commits/mod.ts"
import { GithubPull, GithubPullDateKey } from "../api/pulls/mod.ts"
import { GithubRelease } from "../api/releases/mod.ts"
import { GithubStatsCommitActivity } from "../api/stats-commit-activity/mod.ts"
import { GithubStatsContributor } from "../api/stats-contributors/mod.ts"
import { GithubStatsParticipation } from "../api/stats-participation/mod.ts"

import { SyncInfo } from "./sync-info-schema.ts"

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

  findStatsCodeFrequencies(): AsyncGenerator<DBCodeFrequency>

  findStatsCommitActivities(): AsyncGenerator<GithubStatsCommitActivity>

  findStatsContributors(): AsyncGenerator<GithubStatsContributor>

  findStatsParticipants(): AsyncGenerator<GithubStatsParticipation>

  findStatsPunchCards(): AsyncGenerator<DBPunchCardRead>
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
