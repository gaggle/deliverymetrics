import { ActionRun } from "./github-action-run.ts";
import { ActionWorkflow } from "./github-action-workflow.ts";
import { BoundGithubPullCommit } from "./github-pull-commit.ts";
import { GithubDiff } from "./sync-diff.ts";
import { GithubPull, GithubPullDateKey } from "./github-pull.ts";
import { SyncInfo } from "./sync-info.ts";

export interface ReadonlyGithubClient {
  repoHtmlUrl: string;

  findPulls(opts?: Sortable<GithubPullDateKey>): AsyncGenerator<GithubPull>;

  findUnclosedPulls(): AsyncGenerator<GithubPull>;

  findLatestPull(): Promise<GithubPull | undefined>;

  findPullCommits(opts?: Partial<{ pr: number }>): AsyncGenerator<BoundGithubPullCommit>;

  findLatestSync(): Promise<SyncInfo | undefined>;

  findActionRuns(
    opts?:
      & Partial<{
        branch: string;
        conclusion: string;
        path: string;
      }>
      & Sortable<"created_at" | "updated_at">,
  ): AsyncGenerator<ActionRun>;

  findActionWorkflows(): AsyncGenerator<ActionWorkflow>;
}

export type SyncProgressParams =
  | "actions-run"
  | "actions-workflow"
  | "commit"
  | "pull";

export interface GithubClient extends ReadonlyGithubClient {
  sync(opts?: Partial<{ progress: (type: SyncProgressParams) => void }>): Promise<GithubDiff>;
}

export type Sortable<T> = Partial<{ sort: { key: T; order?: "asc" | "desc" } }>;
