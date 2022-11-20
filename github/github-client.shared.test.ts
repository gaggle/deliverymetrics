import { asserts } from "../dev-deps.ts";

import { GithubMockCache } from "./github-cache.ts";
import { DiskGithubClient, ReadonlyDiskGithubClient } from "./github-client.ts";
import { getFakePull } from "./testing.ts";
import { GithubCache, ReadonlyGithubClient } from "./types.ts";
import { asyncToArray } from "../utils.ts";

const providers: Array<{
  provider: (callable: (opts: { client: ReadonlyGithubClient }) => void | Promise<void>, opts?: Partial<{ cache: GithubCache }>) => Promise<void>,
  name: string
}> = [
  {
    provider: async (callable, { cache } = {}) => {
      const client = new ReadonlyDiskGithubClient({
        cache: cache || new GithubMockCache(),
        owner: "owner",
        repo: "repo",
      });
      await callable({ client });
    },
    name: "ReadonlyGithubClient"
  },
  {
    provider: async (callable, { cache } = {}) => {
      await callable({
        client: new DiskGithubClient({
          cache: cache || new GithubMockCache(),
          owner: "owner",
          repo: "repo",
          token: "token"
        })
      });
    },
    name: "SyncableGithubClient"
  },
];

for (const { provider, name } of providers) {
  Deno.test(name, async (t) => {
    await t.step("#findLatestSync", async (t) => {
      await t.step("should say when it was last updated at", async () => {
        await provider(async ({ client }) => {
          asserts.assertEquals(await (await client.findLatestSync()).updatedAt, 10_000);
        }, { cache: new GithubMockCache({ updatedAt: 10_000 }) });
      });
    });

    await t.step("#findPulls", async (t) => {
      await t.step("should find all cached pulls", async () => {
        await provider(async ({ client }) => {
          asserts.assertEquals(await asyncToArray(client.findPulls()), [getFakePull()]);
        }, { cache: new GithubMockCache({ pulls: [getFakePull()] }) });
      });

      await t.step("should by default sort cached pulls by updated_at", async () => {
        const pull80s = getFakePull({ number: 1, updated_at: "1980-01-01T00:00:00Z" });
        const pull90s = getFakePull({ number: 2, updated_at: "1990-01-01T00:00:00Z" });
        const pull2ks = getFakePull({ number: 3, updated_at: "2000-01-01T00:00:00Z" });

        await provider(async ({ client }) => {
          asserts.assertEquals(await asyncToArray(client.findPulls()), [
            pull80s,
            pull90s,
            pull2ks,
          ]);
        }, {
          cache: new GithubMockCache({
            pulls: [
              pull90s,
              pull2ks,
              pull80s,
            ]
          })
        });
      });

      await t.step("should support custom sorting", async () => {
        const createdRecent = getFakePull({
          number: 1,
          created_at: "1200-01-01T00:00:00Z",
          updated_at: "2000-01-01T00:00:00Z"
        });
        const createdOld = getFakePull({
          number: 2,
          created_at: "1000-01-01T00:00:00Z",
          updated_at: "2200-01-01T00:00:00Z"
        });

        await provider(async ({ client }) => {
          asserts.assertEquals(await asyncToArray(client.findPulls({ sort: { key: "created_at" } })), [
            createdOld,
            createdRecent,
          ]);
        }, {
          cache: new GithubMockCache({
            pulls: [
              createdRecent,
              createdOld,
            ]
          })
        });
      });

      await t.step("should allow sorting desc", async () => {
        const createdRecent = getFakePull({
          number: 1,
          created_at: "1200-01-01T00:00:00Z",
          updated_at: "2000-01-01T00:00:00Z"
        });
        const createdOld = getFakePull({
          number: 2,
          created_at: "1000-01-01T00:00:00Z",
          updated_at: "2200-01-01T00:00:00Z"
        });

        await provider(async ({ client }) => {
          asserts.assertEquals(await asyncToArray(client.findPulls({ sort: { key: "created_at", order: "desc" } })), [
            createdRecent,
            createdOld,
          ]);
        }, {
          cache: new GithubMockCache({
            pulls: [
              createdOld,
              createdRecent,
            ]
          })
        });
      });
    });

    await t.step("#findUnclosedPulls", async (t) => {
      await t.step("should find only the pull that's open", async () => {
        await provider(async ({ client }) => {
          asserts.assertEquals(await asyncToArray(client.findUnclosedPulls()), [getFakePull({
            number: 2,
            state: "open"
          })]);
        }, {
          cache: new GithubMockCache({
            pulls: [
              getFakePull({ number: 1, state: "closed" }),
              getFakePull({ number: 2, state: "open" }),
            ]
          })
        });
      });
    });

    await t.step("#findLatestPull", async (t) => {
      const mostRecentPull = getFakePull({ number: 2, updated_at: "2000-01-01T00:00:00Z" });

      await t.step("should find the most recent cached pull", async () => {
        await provider(async ({ client }) => {
          asserts.assertEquals(await client.findLatestPull(), mostRecentPull);
        }, {
          cache: new GithubMockCache({
            pulls: [
              getFakePull({ number: 3, updated_at: "1980-01-01T00:00:00Z" }),
              mostRecentPull,
              getFakePull({ number: 1, updated_at: "1970-01-01T00:00:00Z" }),
            ]
          })
        });
      });
    });

    await t.step("#htmlUrl", async (t) => {
      await t.step("should return the full GitHub repo URL", async () => {
        await provider(({ client }) => {
          asserts.assertEquals(client.repoHtmlUrl, "https://github.com/owner/repo");
        });
      });
    });
  });
}
