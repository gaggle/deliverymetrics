import { BoundGithubPullCommit } from "./github-pull-commit.ts";
import { GithubDiff } from "./sync-diff.ts";
import { GithubPull, GithubPullDateKey } from "./github-pull.ts";
import { SyncInfo } from "./sync-info.ts";

export interface ReadonlyGithubClient {
  repoHtmlUrl: string;

  findPulls(opts?: Sortable): AsyncGenerator<GithubPull>;

  findUnclosedPulls(): AsyncGenerator<GithubPull>;

  findLatestPull(): Promise<GithubPull | undefined>;

  findPullCommits(opts?: Partial<{ pr: number }>): AsyncGenerator<BoundGithubPullCommit>;

  findLatestSync(): Promise<SyncInfo | undefined>;
}

export interface GithubClient extends ReadonlyGithubClient {
  sync(opts?: Partial<{ progress: (type: "commit" | "pull" | "workflow") => void }>): Promise<GithubDiff>;
}

export type Sortable = Partial<{ sort: { key: GithubPullDateKey; order?: "asc" | "desc" } }>;
