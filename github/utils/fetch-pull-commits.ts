import * as z from "zod";
import { deepMerge } from "deep-merge";

import { Retrier } from "../../fetching/retrier.ts";
import { fetchExhaustively } from "../../fetching/fetch-exhaustively.ts";

import { GithubPull, GithubPullCommit, githubRestSpec } from "../types/mod.ts";

import { createGithubRequest } from "./create-github-request.ts";

type FetchPullCommitsOpts = { retrier: Retrier };

export async function* fetchPullCommits(
  pull: Pick<GithubPull, "commits_url">,
  token: string,
  opts: Partial<FetchPullCommitsOpts> = {},
): AsyncGenerator<GithubPullCommit> {
  const { retrier }: FetchPullCommitsOpts = deepMerge({
    retrier: new Retrier(),
  }, opts);

  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.pullCommits.getUrl(pull),
  });

  for await (const resp of fetchExhaustively(req, { fetchLike: retrier.fetch.bind(retrier) })) {
    if (!resp.ok) {
      throw new Error(`Could not fetch ${req.url}, got ${resp.status} ${resp.statusText}: ${await resp.text()}`);
    }

    const data: z.infer<typeof githubRestSpec.pullCommits.schema> = await resp.json();
    githubRestSpec.pullCommits.schema.parse(data);

    for (const el of data) {
      yield el;
    }
  }
}
