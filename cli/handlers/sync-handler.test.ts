import { assertSpyCallArgs, assertSpyCalls, stub } from "dev:mock"

import { createFakeGithubClient } from "../../libs/github/testing/mod.ts"
import { createFakeJiraClient } from "../../libs/jira/mod.ts"

import { withStubs } from "../../libs/dev-utils.ts"

import { _internals, syncHandler } from "./sync-handler.ts"

Deno.test("syncHandler", async (t) => {
  await t.step("correctly creates a GithubClient", async () => {
    await withStubs(
      async (client) => {
        await syncHandler({
          cacheRoot: ".",
          syncSpecs: [
            { type: "github", owner: "owner", repo: "repo", maxDays: 1, token: "token" },
            {
              type: "jira",
              credentials: { host: "host", apiToken: "apiToken", apiUser: "apiUser" },
              search: { key: "key", syncSubtasks: false },
              maxDays: 1,
            },
          ],
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
      stub(_internals, "getJiraClient", () => createFakeJiraClient()),
      stub(_internals, "fullJiraSync", () => Promise.resolve()),
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

  await t.step("correctly calls #fullJiraSync", async () => {
    const client = await createFakeJiraClient()
    await withStubs(
      async (_, sync) => {
        await syncHandler({
          cacheRoot: ".",
          syncSpecs: [{
            type: "jira",
            credentials: { host: "host", apiToken: "apiToken", apiUser: "apiUser" },
            search: { key: "key", syncSubtasks: false },
            maxDays: 1,
          }],
        })
        assertSpyCalls(sync, 1)
        assertSpyCallArgs(sync, 0, [client, {
          maxDaysToSync: 1,
          projectKey: "key",
          signal: undefined,
          syncSubtasks: false,
        }])
      },
      stub(_internals, "getJiraClient", () => Promise.resolve(client)),
      stub(_internals, "fullJiraSync", () => Promise.resolve()),
    )
  })
})
