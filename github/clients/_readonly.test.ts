import { MockAloeDatabase } from "../../db/mod.ts";

import { asserts } from "../../dev-deps.ts";
import { asyncToArray } from "../../utils.ts";

import { getFakePull } from "../testing.ts";
import {
  AloeGithubClient,
  ReadonlyAloeGithubClient,
} from "./aloe-github-client.ts";
import {
  GithubPull,
  githubPullSchema,
  ReadonlyGithubClient,
  SyncInfo,
  syncInfoSchema,
} from "../types.ts";

async function* yieldGithubClient(
  opts?: {
    ReadonlyAloeGithubClient?: {
      pulls?: Array<GithubPull>;
      syncs?: Array<SyncInfo>;
    };
    AloeGithubClient?: { pulls?: Array<GithubPull>; syncs?: Array<SyncInfo> };
  },
): AsyncGenerator<ReadonlyGithubClient> {
  const db = {
    pulls: await MockAloeDatabase.new({
      schema: githubPullSchema,
      documents: opts?.ReadonlyAloeGithubClient?.pulls,
    }),
    syncs: await MockAloeDatabase.new({
      schema: syncInfoSchema,
      documents: opts?.ReadonlyAloeGithubClient?.syncs,
    }),
  };
  yield new ReadonlyAloeGithubClient({
    owner: "owner",
    repo: "repo",
    db,
  });

  yield new AloeGithubClient({
    owner: "owner",
    repo: "repo",
    token: "token",
    db,
  });
}

Deno.test("Github Client shared tests", async (t) => {
  await t.step("#findLatestSync", async (t) => {
    await t.step("should say when it was last updated at", async (t) => {
      for await (
        const client of yieldGithubClient({
          ReadonlyAloeGithubClient: {
            syncs: [{ createdAt: 0, updatedAt: 10_000 }],
          },
          AloeGithubClient: { syncs: [{ createdAt: 0, updatedAt: 10_000 }] },
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
          ReadonlyAloeGithubClient: { pulls: [getFakePull()] },
          AloeGithubClient: { pulls: [getFakePull()] },
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
            ReadonlyAloeGithubClient: { pulls: [pull90s, pull2ks, pull80s] },
            AloeGithubClient: { pulls: [pull90s, pull2ks, pull80s] },
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
        ReadonlyAloeGithubClient: { pulls: [createdRecent, createdOld] },
        AloeGithubClient: { pulls: [createdRecent, createdOld] },
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
        ReadonlyAloeGithubClient: { pulls: [createdOld, createdRecent] },
        AloeGithubClient: { pulls: [createdOld, createdRecent] },
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
      for await (
        const client of yieldGithubClient({
          ReadonlyAloeGithubClient: {
            pulls: [
              getFakePull({ number: 1, state: "closed" }),
              getFakePull({ number: 2, state: "open" }),
            ],
          },
          AloeGithubClient: {
            pulls: [
              getFakePull({ number: 1, state: "closed" }),
              getFakePull({ number: 2, state: "open" }),
            ],
          },
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
      for await (
        const client of yieldGithubClient({
          ReadonlyAloeGithubClient: {
            pulls: [
              getFakePull({ number: 3, updated_at: "1980-01-01T00:00:00Z" }),
              mostRecentPull,
              getFakePull({ number: 1, updated_at: "1970-01-01T00:00:00Z" }),
            ],
          },
          AloeGithubClient: {
            pulls: [
              getFakePull({ number: 3, updated_at: "1980-01-01T00:00:00Z" }),
              mostRecentPull,
              getFakePull({ number: 1, updated_at: "1970-01-01T00:00:00Z" }),
            ],
          },
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
