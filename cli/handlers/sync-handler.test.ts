import { assertSpyCallArgs, assertSpyCalls, stub } from "dev:mock"

import { createFakeGithubClient, getFakePull } from "../../libs/github/testing.ts"

import { withStubs } from "../../libs/dev-utils.ts"

import { _internals, fullGithubSync, syncHandler } from "./sync-handler.ts"

Deno.test("syncHandler", async (t) => {
  await t.step("correctly creates a GithubClient", async () => {
    await withStubs(
      async (client) => {
        await syncHandler({
          cacheRoot: ".",
          syncSpecs: [{ type: "github", owner: "owner", repo: "repo", maxDays: 1, token: "token" }],
        })
        assertSpyCalls(client, 1)
        assertSpyCallArgs(client, 0, [{
          owner: "owner",
          persistenceDir: "github/owner/repo",
          repo: "repo",
          token: "token",
          type: "GithubClient",
        }])
      },
      stub(_internals, "getGithubClient", () => createFakeGithubClient()),
      stub(_internals, "fullGithubSync", () => Promise.resolve()),
    )
  })

  await t.step("correctly calls #fullGithubSync", async () => {
    const client = await createFakeGithubClient()
    await withStubs(
      async (_, sync) => {
        await syncHandler({
          cacheRoot: ".",
          syncSpecs: [{ type: "github", owner: "owner", repo: "repo", maxDays: 1, token: "token" }],
        })
        assertSpyCalls(sync, 1)
        assertSpyCallArgs(sync, 0, [client, { maxDaysToSync: 1, signal: undefined }])
      },
      stub(_internals, "getGithubClient", () => Promise.resolve(client)),
      stub(_internals, "fullGithubSync", () => Promise.resolve()),
    )
  })
})

Deno.test("fullGithubSync", async (t) => {
  await t.step("calls #sync methods", async () => {
    const client = await createFakeGithubClient()
    await withStubs(
      async (
        syncPulls,
        syncPullCommits,
        syncCommits,
        syncActionRuns,
        syncActionWorkflows,
      ) => {
        await fullGithubSync(client)
        assertSpyCalls(syncPulls, 1)
        assertSpyCalls(syncPullCommits, 1)
        assertSpyCalls(syncCommits, 1)
        assertSpyCalls(syncActionRuns, 1)
        assertSpyCalls(syncActionWorkflows, 1)
      },
      stub(client, "syncPulls", () => Promise.resolve({ syncedAt: 0, syncedPulls: [getFakePull()] })),
      stub(client, "syncPullCommits", () => Promise.resolve({ syncedAt: 0 })),
      stub(client, "syncCommits", () => Promise.resolve({ syncedAt: 0 })),
      stub(client, "syncActionRuns", () => Promise.resolve({ syncedAt: 0 })),
      stub(client, "syncActionWorkflows", () => Promise.resolve({ syncedAt: 0 })),
    )
  })
})
