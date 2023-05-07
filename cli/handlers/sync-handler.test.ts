import { assertSpyCallArgs, assertSpyCalls, stub } from "dev:mock"

import { getFakeGithubPull } from "../../libs/github/api/pulls/mod.ts"

import { createFakeGithubClient } from "../../libs/github/testing/mod.ts"

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
        syncActionRuns,
        syncActionWorkflows,
        syncCommits,
        syncPullCommits,
        syncPulls,
        syncStatsCodeFrequency,
        syncStatsCommitActivity,
        syncStatsContributors,
        syncStatsParticipation,
        syncStatsPunchCard,
      ) => {
        await fullGithubSync(client)
        assertSpyCalls(syncActionRuns, 1)
        assertSpyCalls(syncActionWorkflows, 1)
        assertSpyCalls(syncCommits, 1)
        assertSpyCalls(syncPullCommits, 1)
        assertSpyCalls(syncPulls, 1)
        assertSpyCalls(syncStatsCodeFrequency, 1)
        assertSpyCalls(syncStatsCommitActivity, 1)
        assertSpyCalls(syncStatsContributors, 1)
        assertSpyCalls(syncStatsParticipation, 1)
        assertSpyCalls(syncStatsPunchCard, 1)
      },
      stub(client, "syncActionRuns", () => Promise.resolve({ syncedAt: 0 })),
      stub(client, "syncActionWorkflows", () => Promise.resolve({ syncedAt: 0 })),
      stub(client, "syncCommits", () => Promise.resolve({ syncedAt: 0 })),
      stub(client, "syncPullCommits", () => Promise.resolve({ syncedAt: 0 })),
      stub(client, "syncPulls", () => Promise.resolve({ syncedAt: 0, syncedPulls: [getFakeGithubPull()] })),
      stub(client, "syncReleases", () => Promise.resolve({ syncedAt: 0 })),
      stub(client, "syncStatsCodeFrequency", () => Promise.resolve({ syncedAt: 0 })),
      stub(client, "syncStatsCommitActivity", () => Promise.resolve({ syncedAt: 0 })),
      stub(client, "syncStatsContributors", () => Promise.resolve({ syncedAt: 0 })),
      stub(client, "syncStatsParticipation", () => Promise.resolve({ syncedAt: 0 })),
      stub(client, "syncStatsPunchCard", () => Promise.resolve({ syncedAt: 0 })),
    )
  })
})
