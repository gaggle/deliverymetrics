import { MockAloeDatabase } from "../../db/mod.ts"

import { GithubActionRun, githubActionRunSchema } from "../api/action-run/mod.ts"
import { GithubActionWorkflow, githubActionWorkflowSchema } from "../api/action-workflows/mod.ts"
import { GithubCommit, githubCommitSchema } from "../api/commits/mod.ts"
import { BoundGithubPullCommit, boundGithubPullCommitSchema } from "../api/pull-commits/mod.ts"
import { GithubPull, githubPullSchema } from "../api/pulls/mod.ts"
import { GithubRelease, githubReleaseSchema } from "../api/releases/mod.ts"
import { DBCodeFrequency, dbCodeFrequencySchema } from "../api/stats-code-frequency/mod.ts"
import { GithubStatsCommitActivity, githubStatsCommitActivitySchema } from "../api/stats-commit-activity/mod.ts"
import { GithubStatsParticipation, githubStatsParticipationSchema } from "../api/stats-participation/mod.ts"
import { DBPunchCard, dbPunchCardSchema } from "../api/stats-punch-card/mod.ts"
import { GithubStatsContributor, githubStatsContributorSchema } from "../api/stats-contributors/mod.ts"

import { AloeGithubClient, ReadonlyAloeGithubClient } from "../clients/aloe-github-client.ts"

import { GithubClient, ReadonlyGithubClient, SyncInfo, syncInfoSchema } from "../mod.ts"

export async function createFakeReadonlyGithubClient(
  opts: Partial<{
    actionRuns: Array<GithubActionRun>
    actionWorkflows: Array<GithubActionWorkflow>
    commits: Array<GithubCommit>
    pullCommits: Array<BoundGithubPullCommit>
    pulls: Array<GithubPull>
    releases: Array<GithubRelease>
    statsCodeFrequency: Array<DBCodeFrequency>
    statsCommitActivity: Array<GithubStatsCommitActivity>
    statsContributors: Array<GithubStatsContributor>
    statsParticipation: Array<GithubStatsParticipation>
    statsPunchCard: Array<DBPunchCard>
    syncInfos: Array<SyncInfo>
  }> = {},
): Promise<ReadonlyGithubClient> {
  return new ReadonlyAloeGithubClient({
    owner: "owner",
    repo: "repo",
    db: {
      actionRuns: await MockAloeDatabase.new({
        schema: githubActionRunSchema,
        documents: opts.actionRuns,
      }),
      actionWorkflows: await MockAloeDatabase.new({
        schema: githubActionWorkflowSchema,
        documents: opts.actionWorkflows,
      }),
      commits: await MockAloeDatabase.new({
        schema: githubCommitSchema,
        documents: opts.commits,
      }),
      pullCommits: await MockAloeDatabase.new({
        schema: boundGithubPullCommitSchema,
        documents: opts.pullCommits,
      }),
      pulls: await MockAloeDatabase.new({
        schema: githubPullSchema,
        documents: opts.pulls,
      }),
      releases: await MockAloeDatabase.new({
        schema: githubReleaseSchema,
        documents: opts.releases,
      }),
      statsCodeFrequency: await MockAloeDatabase.new({
        schema: dbCodeFrequencySchema,
        documents: opts.statsCodeFrequency,
      }),
      statsCommitActivity: await MockAloeDatabase.new({
        schema: githubStatsCommitActivitySchema,
        documents: opts.statsCommitActivity,
      }),
      statsContributors: await MockAloeDatabase.new({
        schema: githubStatsContributorSchema,
        documents: opts.statsContributors,
      }),
      statsParticipation: await MockAloeDatabase.new({
        schema: githubStatsParticipationSchema,
        documents: opts.statsParticipation,
      }),
      statsPunchCard: await MockAloeDatabase.new({
        schema: dbPunchCardSchema,
        documents: opts.statsPunchCard,
      }),
      syncs: await MockAloeDatabase.new({
        schema: syncInfoSchema,
        documents: opts.syncInfos,
      }),
    },
  })
}

export async function createFakeGithubClient(
  opts: Partial<{
    actionRuns: Array<GithubActionRun>
    actionWorkflows: Array<GithubActionWorkflow>
    commits: Array<GithubCommit>
    pullCommits: Array<BoundGithubPullCommit>
    pulls: Array<GithubPull>
    releases: Array<GithubRelease>
    statsCodeFrequency: Array<DBCodeFrequency>
    statsCommitActivity: Array<GithubStatsCommitActivity>
    statsContributors: Array<GithubStatsContributor>
    statsParticipation: Array<GithubStatsParticipation>
    statsPunchCard: Array<DBPunchCard>
    syncInfos: Array<SyncInfo>
  }> = {},
): Promise<GithubClient> {
  return new AloeGithubClient({
    owner: "owner",
    repo: "repo",
    token: "token",
    db: {
      actionRuns: await MockAloeDatabase.new({
        schema: githubActionRunSchema,
        documents: opts.actionRuns,
      }),
      actionWorkflows: await MockAloeDatabase.new({
        schema: githubActionWorkflowSchema,
        documents: opts.actionWorkflows,
      }),
      commits: await MockAloeDatabase.new({
        schema: githubCommitSchema,
        documents: opts.commits,
      }),
      pullCommits: await MockAloeDatabase.new({
        schema: boundGithubPullCommitSchema,
        documents: opts.pullCommits,
      }),
      pulls: await MockAloeDatabase.new({
        schema: githubPullSchema,
        documents: opts.pulls,
      }),
      releases: await MockAloeDatabase.new({
        schema: githubReleaseSchema,
        documents: opts.releases,
      }),
      statsCodeFrequency: await MockAloeDatabase.new({
        schema: dbCodeFrequencySchema,
        documents: opts.statsCodeFrequency,
      }),
      statsCommitActivity: await MockAloeDatabase.new({
        schema: githubStatsCommitActivitySchema,
        documents: opts.statsCommitActivity,
      }),
      statsContributors: await MockAloeDatabase.new({
        schema: githubStatsContributorSchema,
        documents: opts.statsContributors,
      }),
      statsParticipation: await MockAloeDatabase.new({
        schema: githubStatsParticipationSchema,
        documents: opts.statsParticipation,
      }),
      statsPunchCard: await MockAloeDatabase.new({
        schema: dbPunchCardSchema,
        documents: opts.statsPunchCard,
      }),
      syncs: await MockAloeDatabase.new({
        schema: syncInfoSchema,
        documents: opts.syncInfos,
      }),
    },
  })
}
