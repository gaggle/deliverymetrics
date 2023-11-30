import { debug } from "std:log"

import { first } from "../../../../utils/mod.ts"
import { Epoch } from "../../../../utils/types.ts"

import { createGithubRequest } from "../../github-utils/mod.ts"

import { fetchRepositoryData } from "../repository/mod.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"

import { GithubActionRun } from "./github-action-run-schema.ts"
import { githubActionRunsRestApiSpec } from "./github-action-runs-rest-api-spec.ts"

type FetchRunsOpts = { newerThan?: Epoch; signal?: AbortSignal }

export async function* fetchGithubActionRuns(
  owner: string,
  repo: string,
  token?: string,
  { newerThan, signal }: Partial<FetchRunsOpts> = {},
): AsyncGenerator<GithubActionRun> {
  const repoData = await first(fetchRepositoryData(owner, repo, token))

  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubActionRunsRestApiSpec.getUrl(owner, repo, repoData.default_branch),
  })

  for await (
    const { data } of fetchGithubApiExhaustively(req, githubActionRunsRestApiSpec.schema, {
      maxPages: 10_000,
      // ↑ There are often many, MANY, runs
      signal,
    })
  ) {
    for (const el of data.workflow_runs) {
      if (newerThan) {
        const updatedAtDate = new Date(el.updated_at)
        if (updatedAtDate.getTime() < newerThan) {
          const fromDate = new Date(newerThan)
          debug(
            `Reached run not updated since ${fromDate.toLocaleString()}: ${el.html_url}`,
          )
          return
        }
      }
      yield el
    }
  }
}
