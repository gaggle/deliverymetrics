import { fetchExhaustively, Retrier } from "../fetching/mod.ts";
import { RequestMethod } from "../fixtures/types.ts";

import { asyncToArray, stringifyPull } from "../utils.ts";
import { deepMerge, equal, groupBy, log } from "../deps.ts";
import { Epoch } from "../types.ts";

import { GithubCache, GithubDiff, GithubPull, githubRestSpec } from "./types.ts";

export class ReadonlyGithubClient {
  readonly cacheInfo: Readonly<{ getUpdatedAt: () => Promise<Epoch | undefined>, location: string }>;
  readonly htmlUrl: string;

  protected readonly cache: GithubCache;
  protected readonly owner: string;
  protected readonly repo: string;

  constructor(opts: { cache: GithubCache; owner: string; repo: string }) {
    this.cache = opts.cache;
    this.cacheInfo = { getUpdatedAt: opts.cache.getUpdatedAt.bind(opts.cache), location: opts.cache.location };
    this.htmlUrl = `https://github.com/${opts.owner}/${opts.repo}`;
    this.owner = opts.owner;
    this.repo = opts.repo;
  }

  async * findPulls(): AsyncGenerator<GithubPull> {
    for (const el of sortPullsByUpdatedAt(await asyncToArray(this.cache.getPulls()))) {
      yield el;
    }
  }

  async * findUnclosedPulls(): AsyncGenerator<GithubPull> {
    for (const el of (await asyncToArray(this.findPulls())).filter(pull => pull.state !== "closed")) {
      yield el;
    }
  }

  async findLatestPull(): Promise<GithubPull | undefined> {
    let pull: GithubPull | undefined = undefined;
    for await (const el of this.findPulls()) {
      pull = el;
    }
    return pull;
  }
}

export class GithubClient extends ReadonlyGithubClient {
  private readonly token: string;

  constructor(opts: { cache: GithubCache; owner: string; repo: string; token: string }) {
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
      newPulls: sortPullsByUpdatedAt(bucket.newPulls || []),
      updatedPulls: sortPullsByUpdatedAt(bucket.updatedPulls || [])
        .filter(updated => !equal.equal(updated, prevPullsByNumber[updated.number]))
        .map(updated => ({ prev: prevPullsByNumber[updated.number], updated }))
    };
  }
}

function sortPullsByUpdatedAt(pulls: Array<GithubPull>): Array<GithubPull> {
  return pulls.sort((a, b) => {
    const aT = new Date(a.updated_at).getTime();
    const bT = new Date(b.updated_at).getTime();
    if (aT === bT) return 0;
    if (aT < bT) return -1;
    if (aT > bT) return 1;
    throw new Error(`Error sorting pulls ${a.number} (${aT}) and ${b.number} (${bT})`);
  });
}

function createGithubRequest(
  {
    token,
    body,
    method,
    url,
  }: {
    token: string
    body?: Record<string, string>,
    method: RequestMethod,
    url: string,
  }): Request {
  const uri = new URL(url);

  return new Request(uri.toString(), {
    body: JSON.stringify(body),
    headers: {
      "Accept": "Accept: application/vnd.github.v3+json",
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method,
  });
}

type FetchPullsOpts = { from: Epoch | undefined, retrier: Retrier }
export async function * fetchPulls(owner: string, repo: string, token: string, opts: Partial<FetchPullsOpts>): AsyncGenerator<GithubPull> {
  const { from, retrier }: FetchPullsOpts = deepMerge({
    from: undefined,
    retrier: new Retrier()
  }, opts);

  const url = githubRestSpec.pulls.getUrl(owner, repo);
  url.searchParams.set("state", "all");
  url.searchParams.set("sort", "updated");
  url.searchParams.set("direction", "desc");
  const req = createGithubRequest({
    method: "GET",
    token,
    url: url.toString(),
  });
  for await(const resp of fetchExhaustively(req, { fetchLike: retrier.fetch.bind(retrier) })) {
    if (!resp.ok) {
      throw new Error(`Could not fetch ${req.url}, got ${resp.status} ${resp.statusText}: ${await resp.text()}`);
    }
    log.debug(`Fetched ${resp.url}`);

    const data = await resp.json();
    githubRestSpec.pulls.schema.parse(data);

    for (const pull of data) {
      const updatedAtDate = new Date(pull.updated_at);
      if (from && updatedAtDate.getTime() < from) {
        const fromDate = new Date(from);
        log.debug(`Reached pull not updated since ${fromDate.toLocaleString()}: ${stringifyPull(pull)}`);
        return;
      }
      yield pull;
    }
  }
}

export const _internals = {
  fetchPulls
};
