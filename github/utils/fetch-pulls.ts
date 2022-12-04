import { debug } from "log";
import { deepMerge } from "deep-merge";

import { fetchExhaustively, Retrier } from "../../fetching/mod.ts";

import { Epoch } from "../../types.ts";
import { stringifyPull } from "../../utils.ts";

import { GithubPull, githubRestSpec } from "../types/mod.ts";

import { createGithubRequest } from "./create-github-request.ts";

type FetchPullsOpts = { from?: Epoch; retrier: Retrier };

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

  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.pulls.getUrl(owner, repo),
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

    const data = await resp.json();
    githubRestSpec.pulls.schema.parse(data);

    for (const pull of data) {
      if (from) {
        const updatedAtDate = new Date(pull.updated_at);
        if (updatedAtDate.getTime() < from) {
          const fromDate = new Date(from);
          debug(
            `Reached pull not updated since ${fromDate.toLocaleString()}: ${stringifyPull(pull)}`,
          );
          return;
        }
      }
      yield pull;
    }
  }
}
