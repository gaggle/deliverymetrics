import { asserts } from "../dev-deps.ts";

import { GithubMockCache } from "./github-cache.ts";
import { GithubClient, ReadonlyGithubClient } from "./github-client.ts";
import { getFakePull } from "./testing.ts";
import { GithubCache } from "./types.ts";
import { asyncToArray } from "../utils.ts";

const providers: Array<{
  provider: (callable: (opts: { client: ReadonlyGithubClient }) => void | Promise<void>, opts?: Partial<{ cache: GithubCache }>) => Promise<void>,
  name: string
}> = [
  {
    provider: async (callable, { cache } = {}) => {
      const client = new ReadonlyGithubClient({
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
        client: new GithubClient({
          cache: cache || new GithubMockCache(),
          owner: "owner",
          repo: "repo",
          token: "token"
        })
      });
    },
    name: "GithubClient"
  },
];

for (const { provider, name } of providers) {
  Deno.test(name, async (t) => {
    await t.step("#cacheInfo", async (t) => {
      await t.step("should say when it was last updated at", async () => {
        await provider(async ({ client }) => {
          asserts.assertEquals(await client.cacheInfo.getUpdatedAt(), 10_000);
        }, { cache: new GithubMockCache({ updatedAt: 10_000 }) });
      });

      await t.step("should return location of cache", async () => {
        await provider(({ client }) => {
          asserts.assertEquals(client.cacheInfo.location, "memory");
        });
      });
    });

    await t.step("#findPulls", async (t) => {
      await t.step("should find all cached pulls", async () => {
        await provider(async ({ client }) => {
          asserts.assertEquals(await asyncToArray(client.findPulls()), [getFakePull()]);
        }, { cache: new GithubMockCache({ pulls: [getFakePull()] }) });
      });

      await t.step("should sort cached pulls", async () => {
        const pull80s = getFakePull({ id: 1, number: 1, updated_at: "1980-01-01T00:00:00Z" });
        const pull2ks = getFakePull({ id: 3, number: 3, updated_at: "2000-01-01T00:00:00Z" });
        const pull90s = getFakePull({ id: 2, number: 2, updated_at: "1990-01-01T00:00:00Z" });

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
    });

    await t.step("#findUnclosedPulls", async (t) => {
      await t.step("should find only the pull that's open", async () => {
        await provider(async ({ client }) => {
          asserts.assertEquals(await asyncToArray(client.findUnclosedPulls()), [getFakePull({ id: 2, number: 2, state: "open" })]);
        }, {
          cache: new GithubMockCache({
            pulls: [
              getFakePull({ id: 1, number: 1, state: "closed" }),
              getFakePull({ id: 2, number: 2, state: "open" }),
            ]
          })
        });
      });
    });

    await t.step("#findLatestPull", async (t) => {
      const mostRecentPull = getFakePull({ id: 2, number: 2, updated_at: "2000-01-01T00:00:00Z" });

      await t.step("should find the most recent cached pull", async () => {
        await provider(async ({ client }) => {
          asserts.assertEquals(await client.findLatestPull(), mostRecentPull);
        }, {
          cache: new GithubMockCache({
            pulls: [
              getFakePull({ id: 3, number: 3, updated_at: "1980-01-01T00:00:00Z" }),
              mostRecentPull,
              getFakePull({ id: 1, number: 1, updated_at: "1970-01-01T00:00:00Z" }),
            ]
          })
        });
      });
    });

    await t.step("#htmlUrl", async (t) => {
      await t.step("should return the full GitHub repo URL", async () => {
        await provider(({ client }) => {
          asserts.assertEquals(client.htmlUrl, "https://github.com/owner/repo");
        });
      });
    });
  });
}
