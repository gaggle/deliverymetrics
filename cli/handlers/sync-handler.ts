import { join } from "std:path"
import { slugify } from "slugify"

import { getGithubClient, GithubClient, SyncInfo, syncInfoTypes } from "../../libs/github/mod.ts"
import { getJiraClient, JiraClient } from "../../libs/jira/mod.ts"

import { AbortError } from "../../utils/errors.ts"

import { dot, write } from "./formatting.ts"

slugify.extend({ ":": "-" })

export type SyncSpec = {
  type: "github"
  owner: string
  repo: string
  token?: string
  maxDays?: number
} | {
  type: "jira"
  credentials: { host: string; apiUser: string; apiToken: string }
  search: { key: string; syncSubtasks: boolean }
  maxDays?: number
}

export async function syncHandler(
  opts: { syncSpecs: Array<SyncSpec>; cacheRoot: string; signal?: AbortSignal },
): Promise<void> {
  write("Syncing...")
  for (const syncSpec of opts.syncSpecs) {
    switch (syncSpec.type) {
      case "github": {
        const client = await _internals.getGithubClient({
          type: "GithubClient",
          persistenceDir: join(opts.cacheRoot, "github", syncSpec.owner, syncSpec.repo),
          repo: syncSpec.repo,
          owner: syncSpec.owner,
          token: syncSpec.token,
        })
        await _internals.fullGithubSync(client, { maxDaysToSync: syncSpec.maxDays, signal: opts.signal })
        break
      }
      case "jira": {
        const { apiToken: token, apiUser: user, host } = syncSpec.credentials
        const client = await _internals.getJiraClient({
          type: "SyncingJiraClient",
          persistenceDir: join(opts.cacheRoot, "jira", slugify(host), slugify(user)),
          host,
          user,
          token,
        })
        await _internals.fullJiraSync(
          client,
          {
            projectKey: syncSpec.search.key,
            syncSubtasks: syncSpec.search.syncSubtasks,
            maxDaysToSync: syncSpec.maxDays,
            signal: opts.signal,
          },
        )
        break
      }
    }
  }
}

export async function fullJiraSync(
  jira: JiraClient,
  { projectKey, syncSubtasks, maxDaysToSync, signal, _stdOutLike }: {
    projectKey: string
    maxDaysToSync?: number
    signal?: AbortSignal
    syncSubtasks?: boolean
    _stdOutLike?: Deno.WriterSync
  },
): Promise<void> {
  let syncNewerThan: number | undefined
  if (maxDaysToSync !== undefined) {
    syncNewerThan = Date.now() - maxDaysToSync * dayInMs
  }

  jira.on("progress", ({ type }) => {
    switch (type) {
      case "search":
        return dot({ char: "s", _stdOutLike })
    }
  })

  write(
    "Legend: s=search",
    { _stdOutLike },
  )
  try {
    await jira.syncSearchIssues(projectKey, { syncSubtasks, newerThan: syncNewerThan, signal })
  } catch (err) {
    if (err instanceof AbortError) {
      return // Nothing more to do
    } else {
      write(`❌  Jira failed to sync, error: ${err}`, { _stdOutLike })
      throw err
    }
  }
  write("✅ ", { _stdOutLike })
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
  fullGithubSync,
  fullJiraSync,
  getGithubClient,
  getJiraClient,
}
