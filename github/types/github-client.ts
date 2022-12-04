import { GithubPull, GithubPullDateKey } from "./github-pull.ts";
import { Epoch } from "../../types.ts";
import { GithubDiff } from "./sync-diff.ts";

export interface ReadonlyGithubClient {
  repoHtmlUrl: string;

  findPulls(opts?: Sortable): AsyncGenerator<GithubPull>;

  findUnclosedPulls(): AsyncGenerator<GithubPull>;

  findLatestPull(): Promise<GithubPull | undefined>;

  findLatestSync(): Promise<{ createdAt: Epoch; updatedAt: Epoch; diff?: GithubDiff } | undefined>;
}

export interface GithubClient extends ReadonlyGithubClient {
  sync(opts?: Partial<{ progress: (type: "commit" | "pull") => void }>): Promise<GithubDiff>;
}

export type Sortable = Partial<{ sort: { key: GithubPullDateKey; order?: "asc" | "desc" } }>;
