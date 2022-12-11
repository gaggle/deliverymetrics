import * as z from "zod";
import { deepMerge } from "deep-merge";

import { fetchExhaustively, Retrier } from "../../fetching/mod.ts";

import { ActionsRun, githubRestSpec } from "../types/mod.ts";

import { createGithubRequest } from "./create-github-request.ts";

type FetchRunsOpts = { retrier: Retrier };

export async function* fetchRuns(
  owner: string,
  repo: string,
  token: string,
  opts: Partial<FetchRunsOpts> = {},
): AsyncGenerator<ActionsRun> {
  const { retrier }: FetchRunsOpts = deepMerge({ retrier: new Retrier() }, opts);

  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.runs.getUrl(owner, repo),
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

    const data: z.infer<typeof githubRestSpec.runs.schema> = await resp.json();
    githubRestSpec.runs.schema.parse(data);

    for (const el of data.workflow_runs) {
      yield el;
    }
  }
}
