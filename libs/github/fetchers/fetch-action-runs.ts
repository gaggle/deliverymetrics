import * as z from "zod"
import { debug } from "std:log"
import { deepMerge } from "std:deep-merge"

import { fetchExhaustively } from "../../fetching/mod.ts"

import { Epoch } from "../../types.ts"

import { createGithubRequest } from "../utils/create-github-request.ts"

import { ActionRun, githubRestSpec } from "../schemas/mod.ts"

type FetchRunsOpts = { newerThan?: Epoch; fetchLike: typeof fetch }

export async function* fetchActionRuns(
  owner: string,
  repo: string,
  token?: string,
  opts: Partial<FetchRunsOpts> = {},
): AsyncGenerator<ActionRun> {
  const { newerThan, fetchLike }: FetchRunsOpts = deepMerge({ fetchLike: fetch }, opts)

  const req = createGithubRequest({
    method: "GET",
    token,
    url: githubRestSpec.actionRuns.getUrl(owner, repo),
  })

  for await (
    const resp of fetchExhaustively(req, {
      fetchLike,
      maxPages: 10_000,
      // ↑ There are often many, MANY, runs
    })
  ) {
    if (!resp.ok) {
      throw new Error(`${resp.status} ${resp.statusText} (${req.url}): ${await resp.text()}`)
    }

    const data: z.infer<typeof githubRestSpec.actionRuns.schema> = await resp.json()
    githubRestSpec.actionRuns.schema.parse(data)

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
