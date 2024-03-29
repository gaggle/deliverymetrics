import { assertEquals } from "dev:asserts"
import { assertSpyCalls, Stub, stub } from "dev:mock"
import { STATUS_TEXT } from "std:http-status"
import { StringWriter } from "std:io"

import { getFakeGithubPull } from "../../libs/github/api/pulls/mod.ts"
import { createFakeGithubClient } from "../../libs/github/testing/mod.ts"
import { GithubClient } from "../../libs/github/types/mod.ts"
import { githubRestSpec } from "../../libs/github/api/github-rest-api-spec.ts"

import { parseWithZodSchemaFromRequest, stringToStream } from "../../utils/mod.ts"
import { withStubs } from "../../utils/dev-utils.ts"

import { fullGithubSync } from "./sync-handler.ts"

type FullGithubSyncStubs = {
  syncActionRuns: Stub
  syncActionWorkflows: Stub
  syncCommits: Stub
  syncPullCommits: Stub
  syncPulls: Stub
  syncReleases: Stub
  syncStatsCodeFrequency: Stub
  syncStatsCommitActivity: Stub
  syncStatsContributors: Stub
  syncStatsParticipation: Stub
  syncStatsPunchCard: Stub
}

async function withFullGithubSync(
  t: Deno.TestContext,
  name: string,
  callable: (
    opts:
      & { t: Deno.TestContext; client: GithubClient; output: string; result: PromiseSettledResult<void> }
      & FullGithubSyncStubs,
  ) => void | Promise<void>,
  opts: Partial<{
    rejectSyncActionRuns: boolean
    rejectSyncActionWorkflows: boolean
    rejectSyncCommits: boolean
    rejectSyncPullCommits: boolean
    rejectSyncPulls: boolean
    rejectSyncReleases: boolean
    rejectSyncStatsCodeFrequency: boolean
    rejectSyncStatsCommitActivity: boolean
    rejectSyncStatsContributors: boolean
    rejectSyncStatsParticipation: boolean
    rejectSyncStatsPunchCard: boolean
  }> = {},
): Promise<void> {
  await t.step(name, async (t) => {
    const client = await createFakeGithubClient()
    await withStubs(
      async (
        syncActionRuns,
        syncActionWorkflows,
        syncCommits,
        syncPullCommits,
        syncPulls,
        syncReleases,
        syncStatsCodeFrequency,
        syncStatsCommitActivity,
        syncStatsContributors,
        syncStatsParticipation,
        syncStatsPunchCard,
      ) => {
        const writer = new StringWriter()
        const [result] = await Promise.allSettled([fullGithubSync(client, { _stdOutLike: writer })])

        await callable({
          t,
          client,
          output: writer.toString(),
          result,
          syncActionRuns,
          syncActionWorkflows,
          syncCommits,
          syncPullCommits,
          syncPulls,
          syncReleases,
          syncStatsCodeFrequency,
          syncStatsCommitActivity,
          syncStatsContributors,
          syncStatsParticipation,
          syncStatsPunchCard,
        })
      },
      stub(client, "syncActionRuns", () => {
        client.emit("progress", { type: "action-run" })
        if (opts.rejectSyncActionRuns) {
          return Promise.reject(new Error("rejectSyncActionRuns"))
        } else {
          client.emit("finished", { type: "action-run" })
          return Promise.resolve({ syncedAt: 0 })
        }
      }),
      stub(client, "syncActionWorkflows", () => {
        client.emit("progress", { type: "action-workflow" })
        if (opts.rejectSyncActionWorkflows) {
          return Promise.reject(new Error("rejectSyncActionWorkflows"))
        } else {
          client.emit("finished", { type: "action-workflow" })
          return Promise.resolve({ syncedAt: 0 })
        }
      }),
      stub(client, "syncCommits", () => {
        client.emit("progress", { type: "commit" })
        if (opts.rejectSyncCommits) {
          return Promise.reject(new Error("rejectSyncCommits"))
        } else {
          client.emit("finished", { type: "commit" })
          return Promise.resolve({ syncedAt: 0 })
        }
      }),
      stub(client, "syncPullCommits", () => {
        client.emit("progress", { type: "pull-commit" })
        if (opts.rejectSyncPullCommits) {
          return Promise.reject(new Error("rejectSyncPullCommits"))
        } else {
          client.emit("finished", { type: "pull-commit" })
          return Promise.resolve({ syncedAt: 0 })
        }
      }),
      stub(client, "syncPulls", () => {
        client.emit("progress", { type: "pull" })
        if (opts.rejectSyncPulls) {
          return Promise.reject(new Error("rejectSyncPulls"))
        } else {
          client.emit("finished", { type: "pull" })
          return Promise.resolve({ syncedAt: 0, syncedPulls: [getFakeGithubPull()] })
        }
      }),
      stub(client, "syncReleases", () => {
        client.emit("progress", { type: "release" })
        if (opts.rejectSyncReleases) {
          return Promise.reject(new Error("rejectSyncReleases"))
        } else {
          client.emit("finished", { type: "release" })
          return Promise.resolve({ syncedAt: 0 })
        }
      }),
      stub(client, "syncStatsCodeFrequency", () => {
        client.emit("progress", { type: "stats-code-frequency" })
        if (opts.rejectSyncStatsCodeFrequency) {
          return Promise.reject(new Error("rejectSyncStatsCodeFrequency"))
        } else {
          client.emit("finished", { type: "stats-code-frequency" })
          return Promise.resolve({ syncedAt: 0 })
        }
      }),
      stub(client, "syncStatsCommitActivity", () => {
        client.emit("progress", { type: "stats-commit-activity" })
        if (opts.rejectSyncStatsCommitActivity) {
          return Promise.reject(new Error("rejectSyncStatsCommitActivity"))
        } else {
          client.emit("finished", { type: "stats-commit-activity" })
          return Promise.resolve({ syncedAt: 0 })
        }
      }),
      stub(client, "syncStatsContributors", () => {
        client.emit("progress", { type: "stats-contributors" })
        if (opts.rejectSyncStatsContributors) {
          const data = {}
          parseWithZodSchemaFromRequest({
            data,
            schema: githubRestSpec.statsContributors.schema,
            request: new Request("https://example.com", { headers: { header: "example" } }),
            response: new Response(stringToStream(JSON.stringify(data)), {
              status: 202,
              statusText: STATUS_TEXT["202"],
              headers: { header: "example" },
            }),
          })
        }
        client.emit("finished", { type: "stats-contributors" })
        return Promise.resolve({ syncedAt: 0 })
      }),
      stub(client, "syncStatsParticipation", () => {
        client.emit("progress", { type: "stats-participation" })
        if (opts.rejectSyncStatsParticipation) {
          return Promise.reject(new Error("rejectSyncStatsParticipation"))
        } else {
          client.emit("finished", { type: "stats-participation" })
          return Promise.resolve({ syncedAt: 0 })
        }
      }),
      stub(client, "syncStatsPunchCard", () => {
        client.emit("progress", { type: "stats-punch-card" })
        if (opts.rejectSyncStatsPunchCard) {
          return Promise.reject(new Error("rejectSyncStatsPunchCard"))
        } else {
          client.emit("finished", { type: "stats-punch-card" })
          return Promise.resolve({ syncedAt: 0 })
        }
      }),
    )
  })
}

Deno.test("fullGithubSync", async (t) => {
  await withFullGithubSync(t, "resolves just fine", (params) => {
    assertEquals(params.result.status, "fulfilled") // It resolved 👍
  })

  await withFullGithubSync(t, "calls #sync* methods", (params) => {
    assertSpyCalls(params.syncActionRuns, 1)
    assertSpyCalls(params.syncActionWorkflows, 1)
    assertSpyCalls(params.syncCommits, 1)
    assertSpyCalls(params.syncPullCommits, 1)
    assertSpyCalls(params.syncPulls, 1)
    assertSpyCalls(params.syncReleases, 1)
    assertSpyCalls(params.syncStatsCodeFrequency, 1)
    assertSpyCalls(params.syncStatsCommitActivity, 1)
    assertSpyCalls(params.syncStatsContributors, 1)
    assertSpyCalls(params.syncStatsParticipation, 1)
    assertSpyCalls(params.syncStatsPunchCard, 1)
  })

  await withFullGithubSync(t, "outputs a status report", ({ output }) => {
    assertEquals(
      output,
      `Legend: r=action-run, w=action-workflow, c=commit, p=pull|pull-commit, R=release, s=stats
rwcpRp
✅ 
`,
    )
  })

  await withFullGithubSync(t, "rejects when any of the syncs fail", ({ result }) => {
    assertEquals(result.status, "rejected")
  }, { rejectSyncActionRuns: true })

  await withFullGithubSync(t, "outputs a report with the syncs that fails", ({ output }) => {
    assertEquals(
      output,
      `Legend: r=action-run, w=action-workflow, c=commit, p=pull|pull-commit, R=release, s=stats
rwcpRp
❌  action-run failed to sync, reason: Error: rejectSyncActionRuns
❌  stats-contributors failed to sync, reason: Validation error: Expected array, received object
  ↳ request: curl -X GET 'https://example.com/' -H 'header: example'
  ↳ response: 202 Accepted
`,
    )
  }, { rejectSyncActionRuns: true, rejectSyncStatsContributors: true })

  await withFullGithubSync(t, "does not sync pull-commits if pulls fails", ({ result, output, syncPullCommits }) => {
    assertEquals(result.status, "rejected")
    assertSpyCalls(syncPullCommits, 0)
    assertEquals(
      output,
      `Legend: r=action-run, w=action-workflow, c=commit, p=pull|pull-commit, R=release, s=stats
rwcpR
❌  pull failed to sync, reason: Error: rejectSyncPulls
❌  pull-commit failed to sync, reason: pending
`,
    )
  }, { rejectSyncPulls: true })
})
