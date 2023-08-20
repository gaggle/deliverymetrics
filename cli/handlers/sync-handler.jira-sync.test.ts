import { assertEquals } from "dev:asserts"
import { assertSpyCalls, Stub, stub } from "dev:mock"
import { StringWriter } from "std:io"

import { createFakeJiraClient, JiraClient } from "../../libs/jira/mod.ts"

import { withStubs } from "../../utils/dev-utils.ts"

import { fullJiraSync } from "./sync-handler.ts"

type FullJiraSyncStubs = {
  syncSearchIssues: Stub
}

async function withFullJiraSync(
  t: Deno.TestContext,
  name: string,
  callable: (
    opts:
      & { t: Deno.TestContext; client: JiraClient; output: string; result: PromiseSettledResult<void> }
      & FullJiraSyncStubs,
  ) => void | Promise<void>,
  opts: Partial<{
    rejectSyncSearchIssues: boolean
  }> = {},
): Promise<void> {
  await t.step(name, async (t) => {
    const client = await createFakeJiraClient()
    await withStubs(
      async (
        syncSearchIssues,
      ) => {
        const writer = new StringWriter()
        const [result] = await Promise.allSettled([fullJiraSync(client, { projectKey: "PRD", _stdOutLike: writer })])

        await callable({
          t,
          client,
          output: writer.toString(),
          result,
          syncSearchIssues,
        })
      },
      stub(client, "syncSearchIssues", () => {
        client.emit("progress", { type: "search" })
        if (opts.rejectSyncSearchIssues) {
          return Promise.reject(new Error("rejectSyncSearchIssues"))
        } else {
          client.emit("finished", { type: "search" })
          return Promise.resolve({ syncedAt: 0 })
        }
      }),
    )
  })
}

Deno.test("fullJiraSync", async (t) => {
  await withFullJiraSync(t, "resolves just fine", (params) => {
    assertEquals(params.result.status, "fulfilled") // It resolved 👍
  })

  await withFullJiraSync(t, "calls #sync* methods", (params) => {
    assertSpyCalls(params.syncSearchIssues, 1)
  })

  await withFullJiraSync(t, "outputs a status report", ({ output }) => {
    assertEquals(
      output,
      `Legend: s=search
s✅ 
`,
    )
  })

  await withFullJiraSync(t, "rejects when any of the syncs fail", ({ result }) => {
    assertEquals(result.status, "rejected")
  }, { rejectSyncSearchIssues: true })

  await withFullJiraSync(t, "outputs a report with the syncs that fails", ({ output }) => {
    assertEquals(
      output,
      `Legend: s=search
s❌  Jira failed to sync, error: Error: rejectSyncSearchIssues
`,
    )
  }, { rejectSyncSearchIssues: true })
})
