import { MockAloeDatabase } from "../db/mod.ts";

import { asserts } from "../dev-deps.ts";
import { asyncToArray } from "../utils.ts";

import { DiskGithubClient, ReadonlyDiskGithubClient } from "./github-client.ts";
import { getFakePull } from "./testing.ts";
import { GithubDiskCache } from "./github-cache.ts";
import { GithubMemoryCache, GithubMockCache } from "./github-cache.ts";
import { githubPullSchema, SyncInfo, syncInfoSchema } from "./mod.ts";
import { ReadonlyAloeGithubClient } from "./aloe-github-client.ts";
import { ReadonlyGithubClient, GithubPull } from "./types.ts";

async function * yieldGithubClient(
  opts?: {
    ReadonlyDiskGithubClient?: { cache?: GithubDiskCache | GithubMemoryCache };
    DiskGithubClient?: { cache?: GithubDiskCache | GithubMemoryCache };
    ReadonlyAloeGithubClient?: { pulls?: Array<GithubPull>; syncs?: Array<SyncInfo> };
  },
): AsyncGenerator<ReadonlyGithubClient> {
  yield new ReadonlyDiskGithubClient({
    cache: opts?.ReadonlyDiskGithubClient?.cache || new GithubMockCache(),
    owner: "owner",
    repo: "repo",
  });

  yield new DiskGithubClient({
    cache: opts?.DiskGithubClient?.cache || new GithubMockCache(),
    owner: "owner",
    repo: "repo",
    token: "token",
  });

  yield new ReadonlyAloeGithubClient({
    owner: "owner", repo: "repo",
    db: {
      pulls: await MockAloeDatabase.new({ schema: githubPullSchema, documents: opts?.ReadonlyAloeGithubClient?.pulls }),
      syncs: await MockAloeDatabase.new({ schema: syncInfoSchema, documents: opts?.ReadonlyAloeGithubClient?.syncs })
    }
  });
}

Deno.test("Github Client shared tests", async (t) => {
  await t.step("#findLatestSync", async (t) => {
    await t.step("should say when it was last updated at", async (t) => {
      for await (
        const client of yieldGithubClient({
        ReadonlyDiskGithubClient: {
          cache: new GithubMockCache({ updatedAt: 10_000 }),
        },
        DiskGithubClient: {
          cache: new GithubMockCache({ updatedAt: 10_000 }),
        },
        ReadonlyAloeGithubClient: { syncs: [{ createdAt: 0, updatedAt: 10_000 }] }
      })
        ) {
        await t.step(`for ${client.constructor.name}`, async () => {
          asserts.assertEquals(
            await (await client.findLatestSync() || {}).updatedAt,
            10_000,
          );
        });
      }
    });
  });

  await t.step("#findPulls", async (t) => {
    await t.step("should find all cached pulls", async () => {
      for await (
        const client of yieldGithubClient({
        ReadonlyDiskGithubClient: {
          cache: new GithubMockCache({ pulls: [getFakePull()] }),
        },
        DiskGithubClient: {
          cache: new GithubMockCache({ pulls: [getFakePull()] }),
        },
        ReadonlyAloeGithubClient: {
          pulls: [getFakePull()]
        }
      })
        ) {
        asserts.assertEquals(await asyncToArray(client.findPulls()), [
          getFakePull(),
        ]);
      }
    });

    await t.step(
      "should by default sort cached pulls by updated_at",
      async () => {
        const pull80s = getFakePull({
          number: 1,
          updated_at: "1980-01-01T00:00:00Z",
        });
        const pull90s = getFakePull({
          number: 2,
          updated_at: "1990-01-01T00:00:00Z",
        });
        const pull2ks = getFakePull({
          number: 3,
          updated_at: "2000-01-01T00:00:00Z",
        });

        for await (
          const client of yieldGithubClient({
          ReadonlyDiskGithubClient: {
            cache: new GithubMockCache({
              pulls: [pull90s, pull2ks, pull80s],
            }),
          },
          DiskGithubClient: {
            cache: new GithubMockCache({
              pulls: [pull90s, pull2ks, pull80s],
            }),
          },
          ReadonlyAloeGithubClient: { pulls: [pull90s, pull2ks, pull80s] }
        })
          ) {
          asserts.assertEquals(await asyncToArray(client.findPulls()), [
            pull80s,
            pull90s,
            pull2ks,
          ]);
        }
      },
    );
  });

  await t.step("should support custom sorting", async () => {
    const createdRecent = getFakePull({
      number: 1,
      created_at: "1200-01-01T00:00:00Z",
      updated_at: "2000-01-01T00:00:00Z",
    });
    const createdOld = getFakePull({
      number: 2,
      created_at: "1000-01-01T00:00:00Z",
      updated_at: "2200-01-01T00:00:00Z",
    });

    for await (
      const client of yieldGithubClient({
      ReadonlyDiskGithubClient: {
        cache: new GithubMockCache({ pulls: [createdRecent, createdOld] }),
      },
      DiskGithubClient: {
        cache: new GithubMockCache({ pulls: [createdRecent, createdOld] }),
      },
      ReadonlyAloeGithubClient: { pulls: [createdRecent, createdOld] }
    })
      ) {
      asserts.assertEquals(
        await asyncToArray(client.findPulls({ sort: { key: "created_at" } })),
        [
          createdOld,
          createdRecent,
        ],
      );
    }
  });

  await t.step("should allow sorting desc", async () => {
    const createdRecent = getFakePull({
      number: 1,
      created_at: "1200-01-01T00:00:00Z",
      updated_at: "2000-01-01T00:00:00Z",
    });
    const createdOld = getFakePull({
      number: 2,
      created_at: "1000-01-01T00:00:00Z",
      updated_at: "2200-01-01T00:00:00Z",
    });

    for await (
      const client of yieldGithubClient({
      ReadonlyDiskGithubClient: {
        cache: new GithubMockCache({ pulls: [createdOld, createdRecent] }),
      },
      DiskGithubClient: {
        cache: new GithubMockCache({ pulls: [createdOld, createdRecent] }),
      },
      ReadonlyAloeGithubClient: { pulls: [createdOld, createdRecent] }
    })
      ) {
      asserts.assertEquals(
        await asyncToArray(
          client.findPulls({ sort: { key: "created_at", order: "desc" } }),
        ),
        [
          createdRecent,
          createdOld,
        ],
      );
    }
  });

  await t.step("#findUnclosedPulls", async (t) => {
    await t.step("should find only the pull that's open", async () => {
      const cache = new GithubMockCache({
        pulls: [
          getFakePull({
            number: 1,
            state: "closed",
          }),
          getFakePull({ number: 2, state: "open" }),
        ],
      });

      for await (
        const client of yieldGithubClient({
        ReadonlyDiskGithubClient: { cache },
        DiskGithubClient: { cache },
        ReadonlyAloeGithubClient: {
          pulls: [
            getFakePull({
              number: 1,
              state: "closed",
            }),
            getFakePull({ number: 2, state: "open" }),
          ]
        }
      })
        ) {
        asserts.assertEquals(await asyncToArray(client.findUnclosedPulls()), [
          getFakePull({
            number: 2,
            state: "open",
          }),
        ]);
      }
    });
  });

  await t.step("#findLatestPull", async (t) => {
    const mostRecentPull = getFakePull({
      number: 2,
      updated_at: "2000-01-01T00:00:00Z",
    });

    await t.step("should find the most recent cached pull", async () => {
      const cache = new GithubMockCache({
        pulls: [
          getFakePull({
            number: 3,
            updated_at: "1980-01-01T00:00:00Z",
          }),
          mostRecentPull,
          getFakePull({ number: 1, updated_at: "1970-01-01T00:00:00Z" }),
        ],
      });

      for await (
        const client of yieldGithubClient({
        ReadonlyDiskGithubClient: { cache },
        DiskGithubClient: { cache },
        ReadonlyAloeGithubClient: {
          pulls: [
            getFakePull({
              number: 3,
              updated_at: "1980-01-01T00:00:00Z",
            }),
            mostRecentPull,
            getFakePull({ number: 1, updated_at: "1970-01-01T00:00:00Z" }),
          ]
        }
      })
        ) {
        asserts.assertEquals(await client.findLatestPull(), mostRecentPull);
      }
    });
  });

  await t.step("#htmlUrl", async (t) => {
    await t.step("should return the full GitHub repo URL", async () => {
      for await (const client of yieldGithubClient()) {
        asserts.assertEquals(
          client.repoHtmlUrl,
          "https://github.com/owner/repo",
        );
      }
    });
  });
});
