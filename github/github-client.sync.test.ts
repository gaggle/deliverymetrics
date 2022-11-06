import { arrayToAsyncGenerator, asyncToArray } from "../utils.ts";
import { asserts, mock, time } from "../dev-deps.ts";
import { withFakeTime, withStubs } from "../dev-utils.ts";

import { _internals, SyncableGithubClient } from "./github-client.ts";
import { getFakePull } from "./testing.ts";
import { GithubMockCache } from "./github-cache.ts";

Deno.test("SyncableGithubClient#sync", async (t) => {
  await t.step("should fetch pulls using the client's owner, repo, and token", async () => {
    const client = new SyncableGithubClient({
      cache: new GithubMockCache(),
      owner: "owner",
      repo: "repo",
      token: "token"
    });
    await withStubs(async (stub) => {
        await client.sync();
        mock.assertSpyCalls(stub, 1);
        asserts.assertObjectMatch(stub.calls[0].args, { "0": "owner", "1": "repo", "2": "token" });
      },
      mock.stub(_internals, "fetchPulls", mock.returnsNext([arrayToAsyncGenerator([getFakePull()])])),
    );
  });

  await t.step("should fetch pulls since the last time the cache was updated", async () => {
    const client = new SyncableGithubClient({
      cache: new GithubMockCache({ updatedAt: 10_000 }),
      owner: "owner",
      repo: "repo",
      token: "token"
    });
    await withStubs(async (stub) => {
        await client.sync();
        mock.assertSpyCalls(stub, 1);
        asserts.assertObjectMatch(stub.calls[0].args, { "3": { from: 10_000 } });
      },
      mock.stub(_internals, "fetchPulls", mock.returnsNext([arrayToAsyncGenerator([getFakePull()])])));
  });

  await t.step("should add fetched pulls to cache", async () => {
    const client = new SyncableGithubClient({
      cache: new GithubMockCache(),
      owner: "owner",
      repo: "repo",
      token: "token"
    });
    const fakePull = getFakePull();
    await withStubs(async (_) => {
        await client.sync();
        asserts.assertEquals(await asyncToArray(client.findPulls()), [fakePull]);
      },
      mock.stub(_internals, "fetchPulls", mock.returnsNext([arrayToAsyncGenerator([fakePull])]))
    );
  });

  await t.step("should update cache's updatedAt", async () => {
    const client = new SyncableGithubClient({
      cache: new GithubMockCache(),
      owner: "owner",
      repo: "repo",
      token: "token"
    });
    await withFakeTime(async () => {
        await withStubs(async () => {
            await client.sync();
            asserts.assertEquals(await client.cacheInfo.getUpdatedAt(), 10_000);
          },
          mock.stub(_internals, "fetchPulls", mock.returnsNext([arrayToAsyncGenerator([])])),
        );
      },
      new time.FakeTime(10_000));
  });

  await t.step("should return syncedAt", async () => {
    const client = new SyncableGithubClient({
      cache: new GithubMockCache(),
      owner: "owner",
      repo: "repo",
      token: "token"
    });
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

  await t.step("should return list of updated pulls", async () => {
    const pullOpen = getFakePull({ id: 1, number: 1, state: "open" });
    const pullClosed = getFakePull({ id: 1, number: 1, state: "closed" });
    const client = new SyncableGithubClient({
      cache: new GithubMockCache({ pulls: [pullOpen] }),
      owner: "owner",
      repo: "repo",
      token: "token"
    });
    await withStubs(async () => {
        const result = await client.sync();
        asserts.assertEquals(result.updatedPulls, [{ prev: pullOpen, updated: pullClosed }]);
      },
      mock.stub(_internals, "fetchPulls", mock.returnsNext([arrayToAsyncGenerator([pullClosed])])),
    );
  });

  await t.step("should return list of new pulls", async () => {
    const newPull = getFakePull({ id: 1, number: 1, state: "closed" });
    const client = new SyncableGithubClient({
      cache: new GithubMockCache(),
      owner: "owner",
      repo: "repo",
      token: "token"
    });
    await withStubs(async () => {
        const result = await client.sync();
        asserts.assertEquals(result.newPulls, [newPull]);
      },
      mock.stub(_internals, "fetchPulls", mock.returnsNext([arrayToAsyncGenerator([newPull])])),
    );
  });
});
