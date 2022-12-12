import * as z from "zod";
import { debug } from "log";
import { deepMerge } from "deep-merge";

import { fetchExhaustively, Retrier } from "../../fetching/mod.ts";

import { Epoch } from "../../types.ts";

import { ActionRun, githubRestSpec } from "../types/mod.ts";

import { createGithubRequest } from "./create-github-request.ts";

type FetchRunsOpts = { from?: Epoch; retrier: Retrier };

export async function* fetchActionRuns(
  owner: string,
  repo: string,
  token: string,
  opts: Partial<FetchRunsOpts> = {},
): AsyncGenerator<ActionRun> {
  const { from, retrier }: FetchRunsOpts = deepMerge({
    from: undefined,
    retrier: new Retrier(),
  }, opts);

  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.actionRuns.getUrl(owner, repo),
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

    const data: z.infer<typeof githubRestSpec.actionRuns.schema> = await resp.json();
    githubRestSpec.actionRuns.schema.parse(data);

    for (const el of data.workflow_runs) {
      if (from) {
        const updatedAtDate = new Date(el.updated_at);
        if (updatedAtDate.getTime() < from) {
          const fromDate = new Date(from);
          debug(
            `Reached run not updated since ${fromDate.toLocaleString()}: ${el.html_url}`,
          );
          return;
        }
      }
      yield el;
    }
  }
}
