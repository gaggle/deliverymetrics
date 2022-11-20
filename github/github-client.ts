import { asyncToArray, first } from "../utils.ts";
import { equal, groupBy } from "../deps.ts";
import { Epoch } from "../types.ts";

import { GithubClient, GithubDiff, GithubPull, GithubPullDateKey, ReadonlyGithubClient } from "./types.ts";
import { GithubDiskCache, GithubMemoryCache } from "./github-cache.ts";
import { fetchPulls } from "./fetch-pulls.ts";

export class ReadonlyDiskGithubClient implements ReadonlyGithubClient {
  readonly repoHtmlUrl: string;

  protected readonly cache: GithubDiskCache | GithubMemoryCache;
  protected readonly owner: string;
  protected readonly repo: string;

  constructor(opts: { cache: GithubDiskCache | GithubMemoryCache; owner: string; repo: string }) {
    this.cache = opts.cache;
    this.repoHtmlUrl = `https://github.com/${opts.owner}/${opts.repo}`;
    this.owner = opts.owner;
    this.repo = opts.repo;
  }

  /**
   * Yield pulls
   *
   * Default sort is by `updated_at`
   */
  async * findPulls({ sort }: Partial<{ sort: { key: GithubPullDateKey, order?: "asc" | "desc" } }> = {}): AsyncGenerator<GithubPull> {
    const sortedPulls = sortPullsByKey(await asyncToArray(this.cache.getPulls()), sort?.key ?? "updated_at");
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

  async findLatestSync(): Promise<{ createdAt: Epoch; updatedAt: Epoch; diff?: GithubDiff }> {
    const updatedAt = await this.cache.getUpdatedAt() || 0;
    return Promise.resolve({ createdAt: updatedAt, updatedAt: updatedAt, diff: undefined });
  }
}

export class DiskGithubClient extends ReadonlyDiskGithubClient implements GithubClient {
  private readonly token: string;

  constructor(opts: { cache: GithubDiskCache | GithubMemoryCache; owner: string; repo: string; token: string }) {
    super(opts);
    this.token = opts.token;
  }

  async sync(): Promise<GithubDiff> {
    const lastSynced = await this.cache.getUpdatedAt();

    const prevPullsByNumber = (await asyncToArray(this.cache.getPulls()))
      .reduce(function (acc, curr) {
        acc[curr.number] = curr;
        return acc;
      }, {} as Record<number, GithubPull>);

    const aboutToFetchTime = new Date().getTime();

    const fetchedPulls: Array<GithubPull> = [];
    for await(const pull of _internals.fetchPulls(this.owner, this.repo, this.token, { from: lastSynced })) {
      fetchedPulls.push(pull);
      await this.cache.putPull(pull);
    }
    await this.cache.putUpdatedAt(aboutToFetchTime);

    const bucket = groupBy(fetchedPulls, (pull) => pull.number in prevPullsByNumber ? "updatedPulls" : "newPulls");

    return {
      syncedAt: aboutToFetchTime,
      newPulls: sortPullsByKey(bucket.newPulls || []),
      updatedPulls: sortPullsByKey(bucket.updatedPulls || [])
        .filter(updated => !equal.equal(updated, prevPullsByNumber[updated.number]))
        .map(updated => ({ prev: prevPullsByNumber[updated.number], updated }))
    };
  }
}

function sortPullsByKey(pulls: Array<GithubPull>, key: GithubPullDateKey = "updated_at"): Array<GithubPull> {
  return pulls.sort((a, b) => {
    const aVal = a[key];
    const aT = aVal === null ? 0 : new Date(aVal).getTime();
    const bVal = b[key];
    const bT = bVal === null ? 0 : new Date(bVal).getTime();
    if (aT === bT) return 0;
    if (aT < bT) return -1;
    if (aT > bT) return 1;
    throw new Error(`Error sorting pulls ${a.number} (${aT}) and ${b.number} (${bT})`);
  });
}

export const _internals = {
  fetchPulls
};
