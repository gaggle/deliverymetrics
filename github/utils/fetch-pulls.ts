import { debug } from "log";
import { deepMerge } from "deep-merge";

import { fetchExhaustively, Retrier } from "../../fetching/mod.ts";

import { Epoch } from "../../types.ts";
import { stringifyPull } from "../../utils.ts";

import { GithubPull, githubRestSpec } from "../types/mod.ts";

import { createGithubRequest } from "./create-github-request.ts";

type FetchPullsOpts = { from: Epoch | undefined; retrier: Retrier };

export async function* fetchPulls(
  owner: string,
  repo: string,
  token: string,
  opts: Partial<FetchPullsOpts> = {},
): AsyncGenerator<GithubPull> {
  const { from, retrier }: FetchPullsOpts = deepMerge({
    from: undefined,
    retrier: new Retrier(),
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
  for await (
    const resp of fetchExhaustively(req, {
      fetchLike: retrier.fetch.bind(retrier),
    })
  ) {
    if (!resp.ok) {
      throw new Error(
        `Could not fetch ${req.url}, got ${resp.status} ${resp.statusText}: ${await resp
          .text()}`,
      );
    }
    debug(`Fetched ${resp.url}`);

    const data = await resp.json();
    githubRestSpec.pulls.schema.parse(data);

    for (const pull of data) {
      const updatedAtDate = new Date(pull.updated_at);
      if (from && updatedAtDate.getTime() < from) {
        const fromDate = new Date(from);
        debug(
          `Reached pull not updated since ${fromDate.toLocaleString()}: ${stringifyPull(pull)}`,
        );
        return;
      }
      yield pull;
    }
  }
}
