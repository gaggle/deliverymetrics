import * as z from "zod";
import { deepMerge } from "std:deep-merge";

import { fetchExhaustively, Retrier } from "../../fetching/mod.ts";

import { ActionWorkflow, githubRestSpec } from "../types/mod.ts";

import { createGithubRequest } from "./create-github-request.ts";

type FetchWorkflowsOpts = { retrier: Retrier };

export async function* fetchActionWorkflows(
  owner: string,
  repo: string,
  token: string,
  opts: Partial<FetchWorkflowsOpts> = {},
): AsyncGenerator<ActionWorkflow> {
  const { retrier }: FetchWorkflowsOpts = deepMerge({ retrier: new Retrier() }, opts);

  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.actionWorkflows.getUrl(owner, repo),
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

    const data: z.infer<typeof githubRestSpec.actionWorkflows.schema> = await resp.json();
    githubRestSpec.actionWorkflows.schema.parse(data);

    for (const el of data.workflows) {
      yield el;
    }
  }
}
