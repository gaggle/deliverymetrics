import { arrayToAsyncGenerator, asyncToArray } from "../utils.ts";
import { asserts, mock, time } from "../dev-deps.ts";
import { withFakeTime, withStubs } from "../dev-utils.ts";

import { _internals, DiskGithubClient } from "./github-client.ts";
import { getFakePull } from "./testing.ts";
import { GithubClient } from "./types.ts";
import { GithubDiskCache, GithubMemoryCache, GithubMockCache } from "./github-cache.ts";

async function * yieldGithubClient(
  opts?: {
    DiskGithubClient?: { cache?: GithubDiskCache | GithubMemoryCache };
  },
): AsyncGenerator<GithubClient> {
  yield new DiskGithubClient({
    cache: opts?.DiskGithubClient?.cache || new GithubMockCache(),
    owner: "owner",
    repo: "repo",
    token: "token",
  });
}

Deno.test("Syncable Github Client shared tests", async (t) => {
  await t.step("should fetch pulls using the client's owner, repo, and token", async (t) => {
    for await (const client of yieldGithubClient()) {
      await t.step(`for ${client.constructor.name}`, async () => {
        await withStubs(async (stub) => {
            await client.sync();
            mock.assertSpyCalls(stub, 1);
            asserts.assertObjectMatch(stub.calls[0].args, { "0": "owner", "1": "repo", "2": "token" });
          },
          mock.stub(_internals, "fetchPulls", mock.returnsNext([arrayToAsyncGenerator([getFakePull()])])),
        );
      });
    }
  });

  await t.step("should fetch pulls since the last time the cache was updated", async (t) => {
    for await (const client of yieldGithubClient({
      DiskGithubClient: { cache: new GithubMockCache({ updatedAt: 10_000 }) }
    })) {
      await t.step(`for ${client.constructor.name}`, async () => {
        await withStubs(async (stub) => {
            await client.sync();
            mock.assertSpyCalls(stub, 1);
            asserts.assertObjectMatch(stub.calls[0].args, { "3": { from: 10_000 } });
          },
          mock.stub(_internals, "fetchPulls", mock.returnsNext([arrayToAsyncGenerator([getFakePull()])]))
        );
      });
    }
  });

  await t.step("should add fetched pulls to cache", async (t) => {
    for await (const client of yieldGithubClient()) {
      const fakePull = getFakePull();
      await t.step(`for ${client.constructor.name}`, async () => {
        await withStubs(async (_) => {
            await client.sync();
            asserts.assertEquals(await asyncToArray(client.findPulls()), [fakePull]);
          },
          mock.stub(_internals, "fetchPulls", mock.returnsNext([arrayToAsyncGenerator([fakePull])]))
        );
      });
    }
  });

  await t.step("should update cache's updatedAt", async (t) => {
    for await (const client of yieldGithubClient()) {
      await t.step(`for ${client.constructor.name}`, async () => {
        await withFakeTime(async () => {
            await withStubs(async () => {
                await client.sync();
                asserts.assertEquals(await (await client.findLatestSync())?.updatedAt, 10_000);
              },
              mock.stub(_internals, "fetchPulls", mock.returnsNext([arrayToAsyncGenerator([])])),
            );
          },
          new time.FakeTime(10_000));
      });
    }
  });

  await t.step("should return syncedAt", async (t) => {
    for await (const client of yieldGithubClient()) {
      await t.step(`for ${client.constructor.name}`, async () => {
        await withFakeTime(async () => {
            await withStubs(async () => {
                const result = await client.sync();
                asserts.assertEquals(result.syncedAt, 10_000);
              },
              mock.stub(_internals, "fetchPulls", mock.returnsNext([arrayToAsyncGenerator([])])),
            );
          },
          new time.FakeTime(10_000));
      });
    }
  });

  await t.step("should return list of updated pulls", async (t) => {
    const pullOpen = getFakePull({ id: 1, number: 1, state: "open" });
    const pullClosed = getFakePull({ id: 1, number: 1, state: "closed" });
    for await (const client of yieldGithubClient({
      DiskGithubClient: { cache: new GithubMockCache({ pulls: [pullOpen] }) }
    })) {
      await t.step(`for ${client.constructor.name}`, async () => {
        await withStubs(async () => {
            const result = await client.sync();
            asserts.assertEquals(result.updatedPulls, [{ prev: pullOpen, updated: pullClosed }]);
          },
          mock.stub(_internals, "fetchPulls", mock.returnsNext([arrayToAsyncGenerator([pullClosed])])),
        );
      });
    }
  });

  await t.step("should return list of new pulls", async (t) => {
    const newPull = getFakePull({ id: 1, number: 1, state: "closed" });
    for await (const client of yieldGithubClient()) {
      await t.step(`for ${client.constructor.name}`, async () => {
        await withStubs(async () => {
            const result = await client.sync();
            asserts.assertEquals(result.newPulls, [newPull]);
          },
          mock.stub(_internals, "fetchPulls", mock.returnsNext([arrayToAsyncGenerator([newPull])])),
        );
      });
    }
  });
});
