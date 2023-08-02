import { join } from "std:path"

import { AloeDatabase } from "../../db/mod.ts"
import { assertUnreachable } from "../../../utils/mod.ts"

import { githubActionRunSchema } from "../api/action-run/mod.ts"
import { githubActionWorkflowSchema } from "../api/action-workflows/mod.ts"
import { githubCommitSchema } from "../api/commits/mod.ts"
import { githubPullSchema } from "../api/pulls/mod.ts"
import { boundGithubPullCommitSchema } from "../api/pull-commits/mod.ts"

import { GithubClient, ReadonlyGithubClient, syncInfoSchema } from "../mod.ts"

import { AloeGithubClient, ReadonlyAloeGithubClient } from "./aloe-github-client.ts"
import { githubReleaseSchema } from "../api/releases/github-release-schema.ts"
import { githubStatsCommitActivitySchema } from "../api/stats-commit-activity/github-stats-commit-activity-schema.ts"
import { githubStatsContributorSchema } from "../api/stats-contributors/github-stats-contributor-schema.ts"
import { githubStatsParticipationSchema } from "../api/stats-participation/github-stats-participation-schema.ts"
import { dbPunchCardSchema } from "../api/stats-punch-card/github-stats-punch-card-schema.ts"
import { dbCodeFrequencySchema } from "../api/stats-code-frequency/github-stats-code-frequency-schema.ts"

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
    releases: await AloeDatabase.new({
      path: join(opts.persistenceDir, "releases.json"),
      schema: githubReleaseSchema,
    }),
    statsCodeFrequency: await AloeDatabase.new({
      path: join(opts.persistenceDir, "stats-code-frequency.json"),
      schema: dbCodeFrequencySchema,
    }),
    statsCommitActivity: await AloeDatabase.new({
      path: join(opts.persistenceDir, "stats-commit-activity.json"),
      schema: githubStatsCommitActivitySchema,
    }),
    statsContributors: await AloeDatabase.new({
      path: join(opts.persistenceDir, "stats-contributors.json"),
      schema: githubStatsContributorSchema,
    }),
    statsParticipation: await AloeDatabase.new({
      path: join(opts.persistenceDir, "stats-participation.json"),
      schema: githubStatsParticipationSchema,
    }),
    statsPunchCard: await AloeDatabase.new({
      path: join(opts.persistenceDir, "stats-punch-card.json"),
      schema: dbPunchCardSchema,
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
