import { join } from "std:path"

import { getGithubClient, GithubClient, SyncInfo, syncInfoTypes } from "../../libs/github/mod.ts"

import { AbortError } from "../../libs/errors.ts"

import { dot, write } from "./formatting.ts"

export type SyncSpec = {
  type: "github"
  owner: string
  repo: string
  token?: string
  maxDays?: number
} | {
  type: "jira"
  searchQuery: string
  host: string
  apiUser: string
  apiToken: string
  maxDays?: number
}

export async function syncHandler(
  opts: { syncSpecs: Array<SyncSpec>; cacheRoot: string; signal?: AbortSignal },
): Promise<void> {
  write("Syncing...")
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
        write(`Jira sync spec: ${JSON.stringify(syncSpec, null, 2)}`)
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
  { maxDaysToSync, signal, _stdOutLike }: Partial<
    { maxDaysToSync: number; signal: AbortSignal; _stdOutLike: Deno.WriterSync }
  > = {},
) {
  let syncNewerThan: number | undefined
  if (maxDaysToSync !== undefined) {
    syncNewerThan = Date.now() - maxDaysToSync * dayInMs
  }

  github.on("progress", ({ type }) => {
    switch (type) {
      case "action-run":
        return dot({ char: "r", _stdOutLike })
      case "action-workflow":
        return dot({ char: "w", _stdOutLike })
      case "commit":
        return dot({ char: "c", _stdOutLike })
      case "pull":
        return dot({ char: "p", _stdOutLike })
      case "pull-commit":
        return dot({ char: "p", _stdOutLike })
      case "release":
        return dot({ char: "R", _stdOutLike })
    }
  })

  github.on("finished", ({ type }) => {
    if (type.startsWith("stats-")) {
      return dot({ char: "s" })
    }
  })

  const errorRegistry = syncInfoTypes.reduce((acc, curr) => ({
    ...acc,
    [curr]: "pending",
  }), {} as Record<SyncInfo["type"], Error | "pending">)

  async function errorRegistrar<T>(name: SyncInfo["type"], cb: () => Promise<T>): Promise<T> {
    try {
      const result = await cb()
      delete errorRegistry[name]
      return result
    } catch (err) {
      errorRegistry[name] = err
      throw new RegisteredError()
    }
  }

  write(
    "Legend: r=action-run, w=action-workflow, c=commit, p=pull|pull-commit, R=release, s=stats",
    { _stdOutLike },
  )
  try {
    await Promise.allSettled([
      errorRegistrar("action-run", () => github.syncActionRuns({ newerThan: syncNewerThan, signal })),
      errorRegistrar("action-workflow", () => github.syncActionWorkflows({ signal })),
      errorRegistrar("commit", () => github.syncCommits({ newerThan: syncNewerThan, signal })),
      errorRegistrar("pull", () => github.syncPulls({ newerThan: syncNewerThan, signal }))
        .then((result) => errorRegistrar("pull-commit", () => github.syncPullCommits(result.syncedPulls, { signal }))),
      errorRegistrar("release", () => github.syncReleases({ newerThan: syncNewerThan, signal })),
      errorRegistrar("stats-code-frequency", () => github.syncStatsCodeFrequency({ signal })),
      errorRegistrar("stats-commit-activity", () => github.syncStatsCommitActivity({ signal })),
      errorRegistrar("stats-contributors", () => github.syncStatsContributors({ signal })),
      errorRegistrar("stats-participation", () => github.syncStatsParticipation({ signal })),
      errorRegistrar("stats-punch-card", () => github.syncStatsPunchCard({ signal })),
    ])
    write("", { _stdOutLike }) // New-line to move on from `dot` calls
  } catch (err) {
    if (err instanceof AbortError) {
      return // Nothing more to do
    } else {
      throw err
    }
  }

  if (Object.keys(errorRegistry).length > 0) {
    const msg = Object.entries(errorRegistry).map(([name, reason]) => `❌  ${name} failed to sync, reason: ${reason}`)
    write(msg.join("\n"), { _stdOutLike })
    throw new RegisteredError(msg.join("\n"))
  } else {
    write("✅ ", { _stdOutLike })
  }
}

export class RegisteredError extends Error {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(...args)
  }
}

export const _internals = {
  getGithubClient,
  fullGithubSync,
}
