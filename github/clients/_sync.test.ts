import { assertEquals, assertObjectMatch } from "dev:asserts";
import { assertSpyCalls, returnsNext, Stub, stub } from "dev:mock";
import { FakeTime } from "dev:time";

import {
  ActionRun,
  ActionWorkflow,
  BoundGithubPullCommit,
  GithubClient,
  GithubPull,
  GithubPullCommit,
  SyncInfo,
} from "../types/mod.ts";

import { arrayToAsyncGenerator, asyncToArray } from "../../utils.ts";
import { withFakeTime, withStubs } from "../../dev-utils.ts";

import {
  createFakeGithubClient,
  getFakeActionRun,
  getFakeActionWorkflow,
  getFakePull,
  getFakePullCommit,
} from "../testing.ts";

import { _internals } from "./aloe-github-client.ts";

async function* yieldGithubClient(
  opts?: {
    pullCommits?: Array<BoundGithubPullCommit>;
    pulls?: Array<GithubPull>;
    syncInfos?: Array<SyncInfo>;
  },
): AsyncGenerator<GithubClient> {
  yield createFakeGithubClient(opts);
}

function withInternalsStubs(
  callable: (stubs: {
    fetchActionRunsStub: Stub;
    fetchActionWorkflowsStub: Stub;
    fetchPullCommitsStub: Stub;
    fetchPullsStub: Stub;
  }) => Promise<void> | void,
  opts: Partial<{
    fetchActionRuns: Array<ActionRun>;
    fetchActionWorkflows: Array<ActionWorkflow>;
    fetchPullCommits: Array<GithubPullCommit>;
    fetchPulls: Array<GithubPull>;
  }> = {},
): Promise<void> {
  const stubs = {
    fetchActionRunsStub: stub(
      _internals,
      "fetchActionRuns",
      returnsNext([arrayToAsyncGenerator(opts.fetchActionRuns || [])]),
    ),
    fetchActionWorkflowsStub: stub(
      _internals,
      "fetchActionWorkflows",
      returnsNext([arrayToAsyncGenerator(opts.fetchActionWorkflows || [])]),
    ),
    fetchPullCommitsStub: stub(
      _internals,
      "fetchPullCommits",
      returnsNext([arrayToAsyncGenerator(opts.fetchPullCommits || [])]),
    ),
    fetchPullsStub: stub(
      _internals,
      "fetchPulls",
      returnsNext([arrayToAsyncGenerator(opts.fetchPulls || [])]),
    ),
  } as const;
  return withStubs(() => callable(stubs), ...Object.values(stubs));
}

Deno.test("Syncable Github Client shared tests", async (t) => {
  await t.step(
    "should fetch using the client's owner, repo, and token",
    async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchPullsStub, fetchPullCommitsStub, fetchActionWorkflowsStub }) => {
            await client.sync();

            assertSpyCalls(fetchPullsStub, 1);
            assertObjectMatch(fetchPullsStub.calls[0].args, {
              "0": "owner",
              "1": "repo",
              "2": "token",
            });

            assertSpyCalls(fetchPullCommitsStub, 1);
            assertObjectMatch(fetchPullCommitsStub.calls[0].args, {
              "0": { commits_url: "https://commits_url" },
              "1": "token",
            });

            assertSpyCalls(fetchActionWorkflowsStub, 1);
            assertObjectMatch(fetchActionWorkflowsStub.calls[0].args, {
              "0": "owner",
              "1": "repo",
              "2": "token",
            });
          }, {
            fetchPulls: [getFakePull({ commits_url: "https://commits_url" })],
            fetchPullCommits: [getFakePullCommit()],
            fetchActionRuns: [getFakeActionRun()],
            fetchActionWorkflows: [getFakeActionWorkflow()],
          });
        });
      }
    },
  );

  await t.step(
    "should fetch pulls since the last time the cache was updated",
    async (t) => {
      for await (
        const client of yieldGithubClient({
          syncInfos: [{ createdAt: 9_000, updatedAt: 10_000 }],
        })
      ) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchPullsStub }) => {
            await client.sync();
            assertSpyCalls(fetchPullsStub, 1);
            assertObjectMatch(fetchPullsStub.calls[0].args, {
              "3": { from: 10_000 },
            });
          }, {
            fetchPulls: [getFakePull()],
            fetchPullCommits: [getFakePullCommit()],
            fetchActionRuns: [getFakeActionRun()],
            fetchActionWorkflows: [getFakeActionWorkflow()],
          });
        });
      }
    },
  );

  await t.step(
    "should pull only until max number of days ago is reached",
    async (t) => {
      for await (
        const client of yieldGithubClient({
          syncInfos: [],
          // ↑ never synced
        })
      ) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(
            async ({ fetchPullsStub, fetchActionRunsStub }) => {
              await client.sync({ syncFromIfUnsynced: 10 });
              assertSpyCalls(fetchPullsStub, 1);
              assertObjectMatch(fetchPullsStub.calls[0].args, {
                "3": { from: 10 },
              });

              assertSpyCalls(fetchActionRunsStub, 1);
              assertObjectMatch(fetchActionRunsStub.calls[0].args, {
                "3": { from: 10 },
              });
            },
          );
        });
      }
    },
  );

  await t.step("should add fetched pulls to cache", async (t) => {
    for await (const client of yieldGithubClient()) {
      const fakePull = getFakePull();
      await t.step(`for ${client.constructor.name}`, async () => {
        await withInternalsStubs(async () => {
          await client.sync();
          assertEquals(await asyncToArray(client.findPulls()), [
            fakePull,
          ]);
        }, {
          fetchPulls: [fakePull],
          fetchPullCommits: [getFakePullCommit()],
          fetchActionWorkflows: [getFakeActionWorkflow()],
          fetchActionRuns: [getFakeActionRun()],
        });
      });
    }
  });

  await t.step("should add fetched pull-commits to cache", async (t) => {
    for await (const client of yieldGithubClient()) {
      const fakePull = getFakePull();
      const fakePullCommit = getFakePullCommit();
      await t.step(`for ${client.constructor.name}`, async () => {
        await withInternalsStubs(async () => {
          await client.sync();
          assertEquals(await asyncToArray(client.findPullCommits()), [
            { ...fakePullCommit, pr: fakePull.number },
          ]);
        }, {
          fetchPulls: [fakePull],
          fetchPullCommits: [fakePullCommit],
          fetchActionWorkflows: [getFakeActionWorkflow()],
          fetchActionRuns: [getFakeActionRun()],
        });
      });
    }
  });

  await t.step("should update cache's updatedAt", async (t) => {
    for await (const client of yieldGithubClient()) {
      await t.step(`for ${client.constructor.name}`, async () => {
        await withFakeTime(async () => {
          await withInternalsStubs(async () => {
            await client.sync();
            assertEquals(
              await (await client.findLatestSync())?.updatedAt,
              10_000,
            );
          }, {
            fetchActionWorkflows: [getFakeActionWorkflow()],
            fetchActionRuns: [getFakeActionRun()],
          });
        }, new FakeTime(10_000));
      });
    }
  });

  await t.step("should return syncedAt", async (t) => {
    for await (const client of yieldGithubClient()) {
      await t.step(`for ${client.constructor.name}`, async () => {
        await withFakeTime(async () => {
          await withInternalsStubs(async () => {
            const result = await client.sync();
            assertEquals(result.syncedAt, 10_000);
          }, {
            fetchActionWorkflows: [getFakeActionWorkflow()],
            fetchActionRuns: [getFakeActionRun()],
          });
        }, new FakeTime(10_000));
      });
    }
  });

  await t.step("should return list of updated pulls", async (t) => {
    const pullOpen = getFakePull({ id: 1, number: 1, state: "open" });
    const pullClosed = getFakePull({ id: 1, number: 1, state: "closed" });
    for await (const client of yieldGithubClient({ pulls: [pullOpen] })) {
      await t.step(`for ${client.constructor.name}`, async () => {
        await withInternalsStubs(async () => {
          const result = await client.sync();
          assertEquals(result.updatedPulls, [{
            prev: pullOpen,
            updated: pullClosed,
          }]);
        }, {
          fetchPulls: [pullClosed],
          fetchPullCommits: [getFakePullCommit({ pr: pullClosed.number })],
          fetchActionWorkflows: [getFakeActionWorkflow()],
          fetchActionRuns: [getFakeActionRun()],
        });
      });
    }
  });

  await t.step("should return list of new pulls", async (t) => {
    const newPull = getFakePull({ id: 1, number: 1, state: "closed" });
    for await (const client of yieldGithubClient()) {
      await t.step(`for ${client.constructor.name}`, async () => {
        await withInternalsStubs(async () => {
          const result = await client.sync();
          assertEquals(result.newPulls, [newPull]);
        }, {
          fetchPulls: [newPull],
          fetchPullCommits: [getFakePullCommit({ pr: newPull.number })],
          fetchActionWorkflows: [getFakeActionWorkflow()],
          fetchActionRuns: [getFakeActionRun()],
        });
      });
    }
  });
});
