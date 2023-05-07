import { MockAloeDatabase } from "../../db/mod.ts"

import { GithubActionRun, githubActionRunSchema } from "../api/action-run/mod.ts"
import { GithubActionWorkflow, githubActionWorkflowSchema } from "../api/action-workflows/mod.ts"
import { GithubCommit, githubCommitSchema } from "../api/commits/mod.ts"
import { BoundGithubPullCommit, boundGithubPullCommitSchema } from "../api/pull-commits/mod.ts"
import { GithubPull, githubPullSchema } from "../api/pulls/mod.ts"

import { AloeGithubClient, ReadonlyAloeGithubClient } from "../clients/aloe-github-client.ts"

import { GithubClient, ReadonlyGithubClient, SyncInfo, syncInfoSchema } from "../mod.ts"

export async function createFakeReadonlyGithubClient(
  { actionRuns, actionWorkflows, commits, pullCommits, pulls, syncInfos }: Partial<{
    actionRuns: Array<GithubActionRun>
    actionWorkflows: Array<GithubActionWorkflow>
    commits: Array<GithubCommit>
    pullCommits: Array<BoundGithubPullCommit>
    pulls: Array<GithubPull>
    syncInfos: Array<SyncInfo>
  }> = {},
): Promise<ReadonlyGithubClient> {
  return new ReadonlyAloeGithubClient({
    owner: "owner",
    repo: "repo",
    db: {
      actionRuns: await MockAloeDatabase.new({
        schema: githubActionRunSchema,
        documents: actionRuns,
      }),
      actionWorkflows: await MockAloeDatabase.new({
        schema: githubActionWorkflowSchema,
        documents: actionWorkflows,
      }),
      commits: await MockAloeDatabase.new({
        schema: githubCommitSchema,
        documents: commits,
      }),
      pullCommits: await MockAloeDatabase.new({
        schema: boundGithubPullCommitSchema,
        documents: pullCommits,
      }),
      pulls: await MockAloeDatabase.new({
        schema: githubPullSchema,
        documents: pulls,
      }),
      syncs: await MockAloeDatabase.new({
        schema: syncInfoSchema,
        documents: syncInfos,
      }),
    },
  })
}

export async function createFakeGithubClient(
  { actionRuns, actionWorkflows, commits, pullCommits, pulls, syncInfos }: Partial<{
    actionRuns: Array<GithubActionRun>
    actionWorkflows: Array<GithubActionWorkflow>
    commits: Array<GithubCommit>
    pullCommits: Array<BoundGithubPullCommit>
    pulls: Array<GithubPull>
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
        documents: actionRuns,
      }),
      actionWorkflows: await MockAloeDatabase.new({
        schema: githubActionWorkflowSchema,
        documents: actionWorkflows,
      }),
      commits: await MockAloeDatabase.new({
        schema: githubCommitSchema,
        documents: commits,
      }),
      pullCommits: await MockAloeDatabase.new({
        schema: boundGithubPullCommitSchema,
        documents: pullCommits,
      }),
      pulls: await MockAloeDatabase.new({
        schema: githubPullSchema,
        documents: pulls,
      }),
      syncs: await MockAloeDatabase.new({
        schema: syncInfoSchema,
        documents: syncInfos,
      }),
    },
  })
}
