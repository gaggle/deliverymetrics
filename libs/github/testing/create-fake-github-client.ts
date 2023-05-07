import { MockAloeDatabase } from "../../db/mod.ts"

import {
  ActionRun,
  actionRunSchema,
  ActionWorkflow,
  actionWorkflowSchema,
  BoundGithubPullCommit,
  boundGithubPullCommitSchema,
  GithubClient,
  GithubCommit,
  githubCommitSchema,
  GithubPull,
  githubPullSchema,
  ReadonlyGithubClient,
  SyncInfo,
  syncInfoSchema,
} from "../schemas/mod.ts"

import { AloeGithubClient, ReadonlyAloeGithubClient } from "../clients/aloe-github-client.ts"

export async function createFakeReadonlyGithubClient(
  { actionRuns, actionWorkflows, commits, pullCommits, pulls, syncInfos }: Partial<{
    actionRuns: Array<ActionRun>
    actionWorkflows: Array<ActionWorkflow>
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
        schema: actionRunSchema,
        documents: actionRuns,
      }),
      actionWorkflows: await MockAloeDatabase.new({
        schema: actionWorkflowSchema,
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
    actionRuns: Array<ActionRun>
    actionWorkflows: Array<ActionWorkflow>
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
        schema: actionRunSchema,
        documents: actionRuns,
      }),
      actionWorkflows: await MockAloeDatabase.new({
        schema: actionWorkflowSchema,
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
