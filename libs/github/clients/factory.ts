import { join } from "std:path"

import { AloeDatabase } from "../../db/mod.ts"
import { assertUnreachable } from "../../utils/mod.ts"

import { githubActionRunSchema } from "../api/action-run/mod.ts"
import { githubActionWorkflowSchema } from "../api/action-workflows/mod.ts"
import { githubCommitSchema } from "../api/commits/mod.ts"
import { githubPullSchema } from "../api/pulls/mod.ts"
import { boundGithubPullCommitSchema } from "../api/pull-commits/mod.ts"

import { GithubClient, ReadonlyGithubClient, syncInfoSchema } from "../mod.ts"

import { AloeGithubClient, ReadonlyAloeGithubClient } from "./aloe-github-client.ts"

interface BaseOpts {
  persistenceDir: string
  owner: string
  repo: string
}

type GithubClientOpts = BaseOpts & {
  type: "GithubClient"
  token?: string
}

type ReadonlyGithubClientOpts = BaseOpts & {
  type: "ReadonlyGithubClient"
  token?: never
}

export async function getGithubClient(opts: GithubClientOpts): Promise<GithubClient>
export async function getGithubClient(opts: ReadonlyGithubClientOpts): Promise<ReadonlyGithubClient>
export async function getGithubClient(
  opts: GithubClientOpts | ReadonlyGithubClientOpts,
): Promise<GithubClient | ReadonlyGithubClient> {
  const db: ConstructorParameters<typeof AloeGithubClient>[0]["db"] = {
    actionRuns: await AloeDatabase.new({
      path: join(opts.persistenceDir, "action-runs.json"),
      schema: githubActionRunSchema,
    }),
    actionWorkflows: await AloeDatabase.new({
      path: join(opts.persistenceDir, "action-workflows.json"),
      schema: githubActionWorkflowSchema,
    }),
    commits: await AloeDatabase.new({
      path: join(opts.persistenceDir, "commits.json"),
      schema: githubCommitSchema,
    }),
    pulls: await AloeDatabase.new({
      path: join(opts.persistenceDir, "pulls.json"),
      schema: githubPullSchema,
    }),
    pullCommits: await AloeDatabase.new({
      path: join(opts.persistenceDir, "pull-commits.json"),
      schema: boundGithubPullCommitSchema,
    }),
    syncs: await AloeDatabase.new({
      path: join(opts.persistenceDir, "syncs.json"),
      schema: syncInfoSchema,
    }),
  }

  const { type } = opts
  switch (type) {
    case "GithubClient":
      return new AloeGithubClient({
        db,
        owner: opts.owner,
        repo: opts.repo,
        token: opts.token,
      })
    case "ReadonlyGithubClient":
      return new ReadonlyAloeGithubClient({
        db,
        owner: opts.owner,
        repo: opts.repo,
      })
    default:
      assertUnreachable(type)
  }
}
