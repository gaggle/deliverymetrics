import { join } from "std:path"

import { getGithubClient, GithubClient } from "../../libs/github/mod.ts"

import { AbortError } from "../../libs/errors.ts"

import { dot } from "./formatting.ts"

export type SyncSpec = {
  type: "github"
  owner: string
  repo: string
  token?: string
  maxDays?: number
} | {
  type: "jira"
  project: string
  queryType: string
  apiToken: string
  apiUser: string
  maxDays?: number
}

export async function syncHandler(
  opts: { syncSpecs: Array<SyncSpec>; cacheRoot: string; signal?: AbortSignal },
): Promise<void> {
  console.log("Syncing...")
  for (const syncSpec of opts.syncSpecs) {
    switch (syncSpec.type) {
      case "github":
        await _internals.fullGithubSync(
          await _internals.getGithubClient({
            type: "GithubClient",
            persistenceDir: join(opts.cacheRoot, "github", syncSpec.owner, syncSpec.repo),
            repo: syncSpec.repo,
            owner: syncSpec.owner,
            token: syncSpec.token,
          }),
          {
            maxDaysToSync: syncSpec.maxDays,
            signal: opts.signal,
          },
        )
        break
      case "jira":
        console.log("JIRA", syncSpec.project)
        break
    }
  }
}

/**
 *              hour min  sec  ms
 */
const dayInMs = 24 * 60 * 60 * 1000

export async function fullGithubSync(
  github: GithubClient,
  { maxDaysToSync, signal }: { maxDaysToSync?: number; signal?: AbortSignal } = {},
) {
  let syncNewerThan: number | undefined
  if (maxDaysToSync !== undefined) {
    syncNewerThan = Date.now() - maxDaysToSync * dayInMs
  }

  github.on("progress", ({ type }) => {
    switch (type) {
      case "action-run":
        return dot("r")
      case "action-workflow":
        return dot("w")
      case "commit":
        return dot("c")
      case "pull":
        return dot("p")
      case "pull-commit":
        return dot("p")
      case "release":
        return dot("R")
    }
  })

  github.on("finished", ({ type }) => {
    if (type.startsWith("stats-")) {
      return dot("s")
    }
  })

  console.log(
    "Legend: r=action-run, w=action-workflow, c=commit, p=pull|pull-commit, R=release, s=stats",
  )
  try {
    await Promise.all([
      github.syncActionRuns({ newerThan: syncNewerThan, signal }),
      github.syncActionWorkflows({ signal }),
      github.syncCommits({ newerThan: syncNewerThan, signal }),
      github.syncPulls({ newerThan: syncNewerThan, signal })
        .then((result) => github.syncPullCommits(result.syncedPulls, { signal })),
      github.syncReleases({ newerThan: syncNewerThan, signal }),
      github.syncStatsCodeFrequency({ signal }),
      github.syncStatsCommitActivity({ signal }),
      github.syncStatsContributors({ signal }),
      github.syncStatsParticipation({ signal }),
      github.syncStatsPunchCard({ signal }),
    ])
  } catch (err) {
    if (err instanceof AbortError) {
      // Nothing more to do
    } else {
      throw err
    }
  }
}

export const _internals = {
  getGithubClient,
  fullGithubSync,
}
