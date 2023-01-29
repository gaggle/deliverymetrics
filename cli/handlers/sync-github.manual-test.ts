import { resolvesNext, stub } from "dev:mock"

import {
  createFakeGithubClient,
  getFakeActionRun,
  getFakeActionWorkflow,
  getFakePull,
  getFakePullCommit,
  getFakeSyncInfo,
} from "../../libs/github/testing.ts"

import { sleep } from "../../libs/utils/mod.ts"
import { withStubs } from "../../libs/dev-utils.ts"

import { _internals, githubSyncHandler } from "./sync-github.ts"

async function successScenario() {
  const openPull = getFakePull({ number: 1, state: "open" })

  const fakeGithubClient = await createFakeGithubClient({
    pulls: [
      openPull,
      getFakePull({ number: 2, state: "closed" }),
    ],
    syncInfos: [
      getFakeSyncInfo({ createdAt: 0, updatedAt: 10 * 1000 /* 10 seconds */ }),
    ],
  })

  stub(fakeGithubClient, "sync", async (args) => {
    const progress = args?.progress
    if (progress) {
      await Promise.all([
        recurse(async (idx) => {
          await sleep(300)
          progress({ type: "actions-workflow", workflow: getFakeActionWorkflow({ name: `Name ${idx}` }) })
        }, 2)
          .then(() =>
            recurse(async (idx) => {
              await sleep(300)
              progress({ type: "actions-run", run: getFakeActionRun({ run_number: idx }) })
            }, 40)
          ),
        recurse(async (idx) => {
          await sleep(300)
          progress({ type: "pull", pull: getFakePull({ number: idx }) })
        }, 20)
          .then(() =>
            recurse(async (idx) => {
              await sleep(300)
              progress({
                type: "commits",
                commits: [getFakePullCommit(), getFakePullCommit(), getFakePullCommit()],
                pr: idx,
              })
            }, 10)
          ),
      ])
    }
    return Promise.resolve({
      newPulls: [getFakePull({ number: 3 })],
      updatedPulls: [{ prev: openPull, updated: getFakePull({ ...openPull, state: "closed" }) }],
      syncedAt: 20 * 1000,
    })
  })

  await withStubs(
    async () => {
      await githubSyncHandler({
        owner: "owner",
        repo: "repo",
        token: "token",
        persistenceRoot: "persistenceRoot",
        maxDays: 90,
      })
    },
    stub(
      _internals,
      "getGithubClient",
      resolvesNext([fakeGithubClient]),
    ),
  )
}

async function recurse(callable: (iter: number) => Promise<void>, count: number) {
  let iter = 0
  while (iter <= count) {
    await callable(iter)
    iter++
  }
}

await successScenario()
