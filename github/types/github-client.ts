import { ActionRun } from "./github-action-run.ts";
import { ActionWorkflow } from "./github-action-workflow.ts";
import { BoundGithubPullCommit, GithubPullCommit } from "./github-pull-commit.ts";
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
        branch: string | RegExp;
        conclusion: string | RegExp;
        path: string | RegExp;
      }>
      & Sortable<"created_at" | "updated_at">,
  ): AsyncGenerator<ActionRun>;

  findActionWorkflows(): AsyncGenerator<ActionWorkflow>;
}

export type SyncProgressParams =
  | { type: "actions-workflow"; workflow: ActionWorkflow }
  | { type: "actions-run"; run: ActionRun }
  | { type: "commits"; commits: Array<GithubPullCommit | BoundGithubPullCommit>; pr: number }
  | { type: "pull"; pull: GithubPull };

export interface GithubClient extends ReadonlyGithubClient {
  sync(opts?: Partial<{ progress: (type: SyncProgressParams) => void }>): Promise<GithubDiff>;
}

export type Sortable<T> = Partial<{ sort: { key: T; order?: "asc" | "desc" } }>;
