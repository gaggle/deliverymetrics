import { Retrier } from "../fetching/retrier.ts";
import { fetchExhaustively } from "../fetching/mod.ts";

import { Epoch, RequestMethod } from "../types.ts";
import { log } from "../deps.ts";
import { stringifyPull } from "../utils.ts";

import { GithubPull, githubRestSpec } from "./types.ts";
import { deepMerge } from "https://deno.land/std@0.159.0/collections/deep_merge.ts";

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

export async function * fetchPulls(owner: string, repo: string, token: string, opts: Partial<FetchPullsOpts> = {}): AsyncGenerator<GithubPull> {
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
