import { debug } from "std:log"
import { difference } from "std:datetime"
import { join } from "std:path"

import { getGithubClient, GithubClient, GithubDiff } from "../../libs/github/mod.ts"
import { withProgress, withSpinner } from "../gui/mod.ts"

import { assertUnreachable, stringifyPull } from "../../libs/utils/mod.ts"

import { formatGithubClientStatus, formatGithubSyncResult } from "./formatting.ts"

const dayInMs = 24 * 60 * 60 * 1000
//              hour min  sec  ms

export async function githubSyncHandler(
  { owner, repo, token, persistenceRoot, maxDays }: {
    owner: string
    repo: string
    token: string
    persistenceRoot: string
    maxDays?: number
  },
) {
  let github: GithubClient
  await withSpinner(async () => {
    github = await _internals.getGithubClient({
      type: "GithubClient",
      persistenceDir: join(persistenceRoot, "github", owner, repo),
      repo,
      owner,
      token,
    })
  }, { start: "Initializing...", succeed: "Initialized", delayFor: 100 })
  console.log(await formatGithubClientStatus(github!))

  let maxSyncFromIfUnsynced: number | undefined
  if (maxDays !== undefined) {
    maxSyncFromIfUnsynced = Date.now() - dayInMs * maxDays
    debug("maxSyncFromIfUnsynced", {
      now: new Date(),
      maxSyncFromIfUnsynced: new Date(maxSyncFromIfUnsynced),
      diff: difference(new Date(), new Date(maxSyncFromIfUnsynced), { units: ["days"] }),
    })
  }

  let syncResult: GithubDiff
  await withProgress(async (progress) => {
    syncResult = await github!.sync({
      syncFromIfUnsynced: maxSyncFromIfUnsynced,
      progress: (el) => {
        const type = el.type
        switch (type) {
          case "actions-run":
            progress.increment("actions-runs", {
              text: `Fetched run ${el.run.run_number} for workflow: ${el.run.name}`,
            })
            break
          case "actions-workflow":
            progress.increment("actions-workflows", { text: `Fetched workflow: ${el.workflow.name}` })
            break
          case "commit":
            progress.increment("commits", { text: `Fetched commit: ${el.commit.sha}` })
            break
          case "pull-commits":
            progress.increment("pull-commits", { text: `Fetched ${el.commits.length} commits for PR: ${el.pr}` })
            break
          case "pull":
            progress.increment("pulls", { text: `Fetched pull: ${stringifyPull(el.pull)}` })
            break
          default:
            return assertUnreachable(type)
        }
      },
    })
  }, {
    title: "↓ Pulling GitHub resources",
    display: "  [:completed completed] :text",
    bars: {
      "commits": { total: Number.MAX_SAFE_INTEGER },
      "pulls": { total: Number.MAX_SAFE_INTEGER },
      "pull-commits": { total: Number.MAX_SAFE_INTEGER, text: "<Waiting for pulls...>" },
      "actions-workflows": { total: Number.MAX_SAFE_INTEGER },
      "actions-runs": { total: Number.MAX_SAFE_INTEGER, text: "<Waiting for action-workflows...>" },
    },
  })
  console.log(formatGithubSyncResult(syncResult!))
}

export const _internals = {
  getGithubClient,
}
