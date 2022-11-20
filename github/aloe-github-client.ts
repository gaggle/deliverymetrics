import { AloeDatabase } from "../db/aloe-database.ts";
import { GithubPull, GithubPullDateKey, ReadonlyGithubClient } from "./types.ts";
import { Epoch } from "../types.ts";
import { sortPullsByKey } from "./sorting.ts";
import { asyncToArray, first } from "../utils.ts";

interface AloeGithubClientDb {
  pulls: AloeDatabase<GithubPull>;
  syncs: AloeDatabase<{ createdAt: Epoch, updatedAt: Epoch }>;
}

export class ReadonlyAloeGithubClient implements ReadonlyGithubClient {
  readonly repoHtmlUrl: string;

  protected readonly db: AloeGithubClientDb;

  constructor(opts: { db: AloeGithubClientDb; owner: string; repo: string }) {
    this.repoHtmlUrl = `https://github.com/${opts.owner}/${opts.repo}`;
    this.db = opts.db;
  }

  /**
   * Yield pulls
   *
   * Default sort is by `updated_at`
   */
  async * findPulls({ sort }: Partial<{ sort: { key: GithubPullDateKey, order?: "asc" | "desc" } }> = {}): AsyncGenerator<GithubPull> {
    const sortedPulls = sortPullsByKey(await this.db.pulls.findMany(), sort?.key ?? "updated_at");
    if (sort?.order === "desc") {
      sortedPulls.reverse();
    }
    for (const el of sortedPulls) {
      yield el;
    }
  }

  async * findUnclosedPulls(): AsyncGenerator<GithubPull> {
    for (const el of (await asyncToArray(this.findPulls())).filter(pull => pull.state !== "closed")) {
      yield el;
    }
  }

  findLatestPull(): Promise<GithubPull | undefined> {
    return first(this.findPulls({ sort: { key: "updated_at", order: "desc" } }));
  }

  async findLatestSync(): Promise<{ createdAt: Epoch; updatedAt: Epoch; } | undefined> {
    const syncs = await this.db.syncs.findMany();
    return syncs[0];
  }
}
