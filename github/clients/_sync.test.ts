import { assertEquals, assertObjectMatch } from "dev:asserts";
import { assertSpyCalls, returnsNext, stub } from "dev:mock";
import { FakeTime } from "dev:time";

import { arrayToAsyncGenerator, asyncToArray } from "../../utils.ts";
import { withFakeTime, withStubs } from "../../dev-utils.ts";

import { GithubClient, GithubPull, SyncInfo } from "../types/mod.ts";

import { createFakeGithubClient, getFakePull } from "../testing.ts";

import { _internals } from "./aloe-github-client.ts";

async function* yieldGithubClient(
  opts?: { pulls?: Array<GithubPull>; syncs?: Array<SyncInfo> },
): AsyncGenerator<GithubClient> {
  yield createFakeGithubClient(opts);
}

Deno.test("Syncable Github Client shared tests", async (t) => {
  await t.step(
    "should fetch pulls using the client's owner, repo, and token",
    async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withStubs(
            async (stub) => {
              await client.sync();
              assertSpyCalls(stub, 1);
              assertObjectMatch(stub.calls[0].args, {
                "0": "owner",
                "1": "repo",
                "2": "token",
              });
            },
            stub(
              _internals,
              "fetchPulls",
              returnsNext([arrayToAsyncGenerator([getFakePull()])]),
            ),
          );
        });
      }
    },
  );

  await t.step(
    "should fetch pulls since the last time the cache was updated",
    async (t) => {
      for await (
        const client of yieldGithubClient({
          syncs: [{ createdAt: 9_000, updatedAt: 10_000 }],
        })
      ) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withStubs(
            async (stub) => {
              await client.sync();
              assertSpyCalls(stub, 1);
              assertObjectMatch(stub.calls[0].args, {
                "3": { from: 10_000 },
              });
            },
            stub(
              _internals,
              "fetchPulls",
              returnsNext([arrayToAsyncGenerator([getFakePull()])]),
            ),
          );
        });
      }
    },
  );

  await t.step("should add fetched pulls to cache", async (t) => {
    for await (const client of yieldGithubClient()) {
      const fakePull = getFakePull();
      await t.step(`for ${client.constructor.name}`, async () => {
        await withStubs(
          async (_) => {
            await client.sync();
            assertEquals(await asyncToArray(client.findPulls()), [
              fakePull,
            ]);
          },
          stub(
            _internals,
            "fetchPulls",
            returnsNext([arrayToAsyncGenerator([fakePull])]),
          ),
        );
      });
    }
  });

  await t.step("should update cache's updatedAt", async (t) => {
    for await (const client of yieldGithubClient()) {
      await t.step(`for ${client.constructor.name}`, async () => {
        await withFakeTime(async () => {
          await withStubs(
            async () => {
              await client.sync();
              assertEquals(
                await (await client.findLatestSync())?.updatedAt,
                10_000,
              );
            },
            stub(
              _internals,
              "fetchPulls",
              returnsNext([arrayToAsyncGenerator([])]),
            ),
          );
        }, new FakeTime(10_000));
      });
    }
  });

  await t.step("should return syncedAt", async (t) => {
    for await (const client of yieldGithubClient()) {
      await t.step(`for ${client.constructor.name}`, async () => {
        await withFakeTime(async () => {
          await withStubs(
            async () => {
              const result = await client.sync();
              assertEquals(result.syncedAt, 10_000);
            },
            stub(
              _internals,
              "fetchPulls",
              returnsNext([arrayToAsyncGenerator([])]),
            ),
          );
        }, new FakeTime(10_000));
      });
    }
  });

  await t.step("should return list of updated pulls", async (t) => {
    const pullOpen = getFakePull({ id: 1, number: 1, state: "open" });
    const pullClosed = getFakePull({ id: 1, number: 1, state: "closed" });
    for await (const client of yieldGithubClient({ pulls: [pullOpen] })) {
      await t.step(`for ${client.constructor.name}`, async () => {
        await withStubs(
          async () => {
            const result = await client.sync();
            assertEquals(result.updatedPulls, [{
              prev: pullOpen,
              updated: pullClosed,
            }]);
          },
          stub(
            _internals,
            "fetchPulls",
            returnsNext([arrayToAsyncGenerator([pullClosed])]),
          ),
        );
      });
    }
  });

  await t.step("should return list of new pulls", async (t) => {
    const newPull = getFakePull({ id: 1, number: 1, state: "closed" });
    for await (const client of yieldGithubClient()) {
      await t.step(`for ${client.constructor.name}`, async () => {
        await withStubs(
          async () => {
            const result = await client.sync();
            assertEquals(result.newPulls, [newPull]);
          },
          stub(
            _internals,
            "fetchPulls",
            returnsNext([arrayToAsyncGenerator([newPull])]),
          ),
        );
      });
    }
  });
});
