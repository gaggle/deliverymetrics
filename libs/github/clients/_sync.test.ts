import { assertEquals, assertObjectMatch, assertRejects } from "dev:asserts"
import { assertSpyCalls, returnsNext, Stub, stub } from "dev:mock"
import { FakeTime } from "dev:time"

import { arrayToAsyncGenerator, asyncToArray, sleep } from "../../utils/mod.ts"

import { withFakeTime, withStubs } from "../../dev-utils.ts"
import { AbortError } from "../../errors.ts"

import {
  ActionRun,
  ActionWorkflow,
  BoundGithubPullCommit,
  GithubClient,
  GithubCommit,
  GithubPull,
  SyncInfo,
} from "../types/mod.ts"

import {
  createFakeGithubClient,
  getFakeActionRun,
  getFakeActionWorkflow,
  getFakeCommit,
  getFakePull,
  getFakePullCommit,
  getFakeSyncInfo,
} from "../testing.ts"

import { _internals } from "./aloe-github-client.ts"

async function* yieldGithubClient(
  opts?: Partial<{
    actionRuns: Array<ActionRun>
    actionWorkflows: Array<ActionWorkflow>
    commits: Array<GithubCommit>
    pullCommits: Array<BoundGithubPullCommit>
    pulls: Array<GithubPull>
    syncInfos: Array<SyncInfo>
  }>,
): AsyncGenerator<GithubClient> {
  yield createFakeGithubClient(opts)
}

type InternalsStubData<T> = Array<AsyncGenerator<T>> | Array<Array<T>> | (() => AsyncGenerator<T>)

function withInternalsStubs(
  callable: (stubs: {
    fetchActionRunsStub: Stub
    fetchActionWorkflowsStub: Stub
    fetchCommitsStub: Stub
    fetchPullCommitsStub: Stub
    fetchPullsStub: Stub
  }) => Promise<void> | void,
  opts: Partial<{
    fetchActionRuns: InternalsStubData<ActionRun | Error>
    fetchActionWorkflows: InternalsStubData<ActionWorkflow | Error>
    fetchCommits: InternalsStubData<GithubCommit | Error>
    fetchPullCommits: InternalsStubData<GithubCommit | Error>
    fetchPulls: InternalsStubData<GithubPull | Error>
  }> = {},
): Promise<void> {
  function resolve<T>(stubData?: InternalsStubData<T | Error>): Array<AsyncGenerator<T>> {
    const data = stubData as unknown as InternalsStubData<T>
    // ↑ returnsNext definitely takes T|Error in runtime, but I guess does not accept that in its types?
    //   I haven't deciphered why, but I can infer from returning just T that the whole thing compiles.
    //   So… here I pretend the T|Error is just T to make returnsNext happy
    //   whilst still letting the compiler help with the various InternalsStubData union variants.

    if (!data) return []

    if (Array.isArray(data)) {
      return data.map((el) => Array.isArray(el) ? arrayToAsyncGenerator(el) : el)
    }

    return [data()]
  }
  const stubs = {
    fetchActionRunsStub: stub(
      _internals,
      "fetchActionRuns",
      returnsNext(resolve(opts.fetchActionRuns)),
    ),
    fetchActionWorkflowsStub: stub(
      _internals,
      "fetchActionWorkflows",
      returnsNext(resolve(opts.fetchActionWorkflows)),
    ),
    fetchCommitsStub: stub(
      _internals,
      "fetchCommits",
      returnsNext(resolve(opts.fetchCommits)),
    ),
    fetchPullCommitsStub: stub(
      _internals,
      "fetchPullCommits",
      returnsNext(resolve(opts.fetchPullCommits)),
    ),

    fetchPullsStub: stub(
      _internals,
      "fetchPulls",
      returnsNext(resolve(opts.fetchPulls)),
    ),
  } as const
  return withStubs(() => callable(stubs), ...Object.values(stubs))
}

Deno.test("Syncable Github Client shared tests", async (t) => {
  await t.step("#syncPulls", async (t) => {
    await t.step("should sync using the client's owner, repo, and token", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchPullsStub }) => {
            await client.syncPulls()

            assertSpyCalls(fetchPullsStub, 1)
            assertObjectMatch(fetchPullsStub.calls[0].args, {
              "0": "owner",
              "1": "repo",
              "2": "token",
            })
          }, {
            fetchPulls: [[getFakePull({ commits_url: "https://commits_url" })]],
          })
        })
      }
    })

    await t.step("should sync only newer than specified time", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchPullsStub }) => {
            await client.syncPulls({ newerThan: 10 })
            assertSpyCalls(fetchPullsStub, 1)
            assertObjectMatch(fetchPullsStub.calls[0].args, {
              "3": { newerThan: 10 },
            })
          }, { fetchPulls: [[getFakePull()]] })
        })
      }
    })

    await t.step("should add fetched items to cache", async (t) => {
      for await (const client of yieldGithubClient()) {
        const fakePull = getFakePull()
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async () => {
            await client.syncPulls()
            assertEquals(await asyncToArray(client.findPulls()), [fakePull])
          }, { fetchPulls: [[fakePull]] })
        })
      }
    })

    await t.step("should upsert fetched items", async (t) => {
      const fakePull1 = getFakePull({ number: 1 })
      const fakePull2 = getFakePull({ number: 2 })
      for await (
        const client of yieldGithubClient({
          pulls: [fakePull1, fakePull2],
          syncInfos: [getFakeSyncInfo({ type: "pull", createdAt: 0, updatedAt: 10_000 })],
        })
      ) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async () => {
            await client.syncPulls()
            assertEquals(await asyncToArray(client.findPulls()), [fakePull1, fakePull2])
          }, { fetchPulls: [[fakePull2]] })
        })
      }
    })

    await t.step("should leave an unfinished sync marker if sync fails", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async () => {
            await withInternalsStubs(async () => {
              await assertRejects(() => client.syncPulls())
              assertEquals(await client.findLatestSync({ type: "pull", includeUnfinished: true }), {
                type: "pull",
                createdAt: 10_000,
              })
            }, {
              async *fetchPulls() {
                yield getFakePull()
                throw new Error("oh noes")
              },
            })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should create a sync marker", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async () => {
            await withInternalsStubs(async () => {
              await client.syncPulls()
              assertEquals(await client.findLatestSync({ type: "pull" }), {
                type: "pull",
                createdAt: 10_000,
                updatedAt: 10_000,
              })
            }, { fetchPulls: [[getFakePull()]] })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should return syncedAt", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async (t) => {
            await withInternalsStubs(async () => {
              const result = await client.syncPulls()
              assertEquals(result.syncedAt, 10_000)
            }, {
              async *fetchPulls() {
                await t.tickAsync(1000)
                yield getFakePull()
              },
            })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should return synced pulls", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async () => {
            const fakePull = getFakePull()
            await withInternalsStubs(async () => {
              const result = await client.syncPulls()
              assertEquals(result.syncedPulls, [fakePull])
            }, { fetchPulls: [[fakePull]] })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should react to abort", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          const pull1 = getFakePull({ number: 1 })
          const pull2 = getFakePull({ number: 2 })
          await withInternalsStubs(async () => {
            await assertRejects(() => client.syncPulls({ signal: AbortSignal.timeout(1) }), AbortError)
            assertEquals(await asyncToArray(client.findPulls()), [pull1])
          }, {
            async *fetchPulls() {
              yield pull1
              await sleep(5)
              yield pull2
            },
          })
        })
      }
    })

    await t.step("should respect newerThan", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchPullsStub }) => {
            await client.syncPulls({ newerThan: new Date("2000").getTime() })
            assertEquals(fetchPullsStub.calls[0].args[3].newerThan, new Date("2000").getTime())
          }, {
            fetchPulls: [[getFakePull()]],
          })
        })
      }
    })

    await t.step("should sync to latest fully completed sync", async (t) => {
      for await (
        const client of yieldGithubClient({
          syncInfos: [
            { type: "pull", createdAt: new Date("2000").getTime(), updatedAt: new Date("2000").getTime() },
            { type: "pull", createdAt: new Date("2005").getTime(), updatedAt: new Date("2005").getTime() },
            // ↑ 🎉 2005 is the most recent & finished & pull sync
            { type: "commit", createdAt: new Date("2010").getTime(), updatedAt: new Date("2010").getTime() },
            { type: "pull", createdAt: new Date("2015").getTime() },
          ],
        })
      ) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchPullsStub }) => {
            await client.syncPulls()
            assertEquals(fetchPullsStub.calls[0].args[3].newerThan, new Date("2005").getTime())
          }, {
            fetchPulls: [[getFakePull()]],
          })
        })
      }
    })

    await t.step("choose the most recent if both latest sync & newerThan are present", async (t) => {
      for await (
        const client of yieldGithubClient({
          syncInfos: [{ type: "pull", createdAt: new Date("2005").getTime(), updatedAt: new Date("2005").getTime() }],
        })
      ) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchPullsStub }) => {
            await client.syncPulls({ newerThan: new Date("2010").getTime() })
            assertEquals(fetchPullsStub.calls[0].args[3].newerThan, new Date("2010").getTime())
          }, {
            fetchPulls: [[getFakePull()]],
          })
        })
      }
      for await (
        const client of yieldGithubClient({
          syncInfos: [{ type: "pull", createdAt: new Date("2010").getTime(), updatedAt: new Date("2010").getTime() }],
        })
      ) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchPullsStub }) => {
            await client.syncPulls({ newerThan: new Date("2005").getTime() })
            assertEquals(fetchPullsStub.calls[0].args[3].newerThan, new Date("2010").getTime())
          }, {
            fetchPulls: [[getFakePull()]],
          })
        })
      }
    })
  })

  await t.step("#syncPullCommits", async (t) => {
    await t.step("should sync using the client's owner, repo, and token", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchPullCommitsStub }) => {
            await client.syncPullCommits([getFakePull({ number: 2 })])

            assertSpyCalls(fetchPullCommitsStub, 1)
            assertObjectMatch(fetchPullCommitsStub.calls[0].args, {
              "0": { commits_url: "https://api.github.com/repos/owner/repo/pulls/2/commits" },
              "1": "token",
            })
          }, {
            fetchPullCommits: [[getFakePullCommit()]],
          })
        })
      }
    })

    await t.step("should add fetched items to cache", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async () => {
            await client.syncPullCommits([getFakePull({ number: 2 })])
            assertEquals(await asyncToArray(client.findPullCommits({ pr: 2 })), [getFakePullCommit({ pr: 2 })])
          }, { fetchPullCommits: [arrayToAsyncGenerator([getFakePullCommit()])] })
        })
      }
    })

    await t.step("should upsert fetched items", async (t) => {
      const fakeCommit1 = getFakePullCommit({ pr: 1 })
      const fakePull = getFakePull({ number: 2 })
      const fakeCommit2 = getFakePullCommit({ pr: 2 })
      for await (
        const client of yieldGithubClient({
          pullCommits: [fakeCommit1, fakeCommit2],
          syncInfos: [getFakeSyncInfo({ type: "pull-commit", createdAt: 0, updatedAt: 10_000 })],
        })
      ) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async () => {
            await client.syncPullCommits([fakePull])
            assertEquals(await asyncToArray(client.findPullCommits()), [fakeCommit1, fakeCommit2])
          }, { fetchPullCommits: [arrayToAsyncGenerator([getFakePullCommit()])] })
        })
      }
    })

    await t.step("should leave an unfinished sync marker if sync fails", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async () => {
            await withInternalsStubs(async () => {
              await assertRejects(() => client.syncPullCommits([getFakePull()]))

              assertEquals(await client.findLatestSync({ type: "pull-commit", includeUnfinished: true }), {
                type: "pull-commit",
                createdAt: 10_000,
              })
            }, {
              fetchPullCommits: [[getFakePullCommit(), new Error("oh noes")]],
            })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should create a sync marker", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async () => {
            await withInternalsStubs(async () => {
              await client.syncPullCommits([getFakePull()])
              assertEquals(await client.findLatestSync({ type: "pull-commit" }), {
                type: "pull-commit",
                createdAt: 10_000,
                updatedAt: 10_000,
              })
            }, { fetchPullCommits: [arrayToAsyncGenerator([getFakePullCommit()])] })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should return syncedAt", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async (t) => {
            await withInternalsStubs(async () => {
              const result = await client.syncPullCommits([getFakePull()])
              assertEquals(result.syncedAt, 10_000)
            }, {
              async *fetchPullCommits() {
                await t.tickAsync(1000)
                yield getFakePullCommit()
              },
            })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should react to abort", async (t) => {
      const pull1 = getFakePull({ number: 1 })
      const pullCommit1 = getFakePullCommit({ pr: pull1.number, node_id: "1a" })
      const pullCommit2 = getFakePullCommit({ pr: pull1.number, node_id: "1b" })
      async function* fetchPullCommits1() {
        await sleep(5)
        yield pullCommit1
        await sleep(5)
        yield pullCommit2
      }

      const pull2 = getFakePull({ number: 2 })
      async function* fetchPullCommits2() {
        await sleep(5)
        yield getFakePullCommit({ pr: pull2.number, node_id: "2a" })
        await sleep(5)
        yield getFakePullCommit({ pr: pull2.number, node_id: "2b" })
      }

      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async () => {
            await assertRejects(
              () => client.syncPullCommits([pull1, pull2], { signal: AbortSignal.timeout(1) }),
              AbortError,
            )
            // ↑ 1. Syncing commits for two pulls, with the AbortSignal timing out after 1 tick…
            // ↑ 3. …then the sync will reject with AbortError…
            assertEquals(await asyncToArray(client.findPullCommits()), [pullCommit1, pullCommit2])
            // ↑ 4. …and cache will contain only the first pull's commits
            //      because the abort happened during processing of the first pull
          }, {
            fetchPullCommits: [fetchPullCommits1(), fetchPullCommits2()],
            // ↑ 2. …and given two sets of pull-commits, one for each pull…
          })
        })
      }
    })
  })

  await t.step("#syncCommits", async (t) => {
    await t.step("should sync using the client's owner, repo, and token", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchCommitsStub }) => {
            await client.syncCommits()

            assertSpyCalls(fetchCommitsStub, 1)
            assertObjectMatch(fetchCommitsStub.calls[0].args, {
              "0": "owner",
              "1": "repo",
              "2": "token",
            })
          }, {
            fetchCommits: [[getFakeCommit()]],
          })
        })
      }
    })

    await t.step("should sync only newer than specified time", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchCommitsStub }) => {
            await client.syncCommits({ newerThan: 10 })
            assertSpyCalls(fetchCommitsStub, 1)
            assertObjectMatch(fetchCommitsStub.calls[0].args, {
              "3": { newerThan: 10 },
            })
          }, { fetchCommits: [[getFakeCommit()]] })
        })
      }
    })

    await t.step("should add fetched items to cache", async (t) => {
      for await (const client of yieldGithubClient()) {
        const fakeCommit = getFakeCommit()
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async () => {
            await client.syncCommits()
            assertEquals(await asyncToArray(client.findCommits()), [fakeCommit])
          }, { fetchCommits: [[fakeCommit]] })
        })
      }
    })

    await t.step("should upsert fetched items", async (t) => {
      const fakeCommit1 = getFakeCommit({ sha: "1", node_id: "1" })
      const fakeCommit2 = getFakeCommit({ sha: "2", node_id: "2" })
      for await (const client of yieldGithubClient({ commits: [fakeCommit1, fakeCommit2] })) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async () => {
            await client.syncCommits()
            assertEquals(await asyncToArray(client.findCommits()), [fakeCommit1, fakeCommit2])
          }, { fetchCommits: [[fakeCommit2]] })
        })
      }
    })

    await t.step("should leave an unfinished sync marker if sync fails", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async () => {
            await withInternalsStubs(async () => {
              await assertRejects(() => client.syncCommits())
              assertEquals(await client.findLatestSync({ type: "commit", includeUnfinished: true }), {
                type: "commit",
                createdAt: 10_000,
              })
            }, {
              async *fetchCommits() {
                yield getFakeCommit()
                throw new Error("oh noes")
              },
            })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should create a sync marker", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async () => {
            await withInternalsStubs(async () => {
              await client.syncCommits()
              assertEquals(await client.findLatestSync({ type: "commit" }), {
                type: "commit",
                createdAt: 10_000,
                updatedAt: 10_000,
              })
            }, { fetchCommits: [[getFakeCommit()]] })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should return syncedAt", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async (t) => {
            await withInternalsStubs(async () => {
              const result = await client.syncCommits()
              assertEquals(result.syncedAt, 10_000)
            }, {
              async *fetchCommits() {
                await t.tickAsync(1000)
                yield getFakeCommit()
              },
            })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should react to abort", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          const commit1 = getFakeCommit({ node_id: "1" })
          const commit2 = getFakeCommit({ node_id: "2" })
          await withInternalsStubs(async () => {
            await assertRejects(() => client.syncCommits({ signal: AbortSignal.timeout(1) }), AbortError)
            assertEquals(await asyncToArray(client.findCommits()), [commit1])
          }, {
            async *fetchCommits() {
              yield commit1
              await sleep(5)
              yield commit2
            },
          })
        })
      }
    })

    await t.step("should respect newerThan", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchCommitsStub }) => {
            await client.syncCommits({ newerThan: new Date("2000").getTime() })
            assertEquals(fetchCommitsStub.calls[0].args[3].newerThan, new Date("2000").getTime())
          }, { fetchCommits: [[getFakeCommit()]] })
        })
      }
    })

    await t.step("should sync to latest fully completed sync", async (t) => {
      for await (
        const client of yieldGithubClient({
          syncInfos: [
            { type: "commit", createdAt: new Date("2000").getTime(), updatedAt: new Date("2000").getTime() },
            { type: "commit", createdAt: new Date("2005").getTime(), updatedAt: new Date("2005").getTime() },
            // ↑ 🎉 2005 is the most recent & finished & commit sync
            { type: "pull", createdAt: new Date("2010").getTime(), updatedAt: new Date("2010").getTime() },
            { type: "commit", createdAt: new Date("2015").getTime() },
          ],
        })
      ) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchCommitsStub }) => {
            await client.syncCommits()
            assertEquals(fetchCommitsStub.calls[0].args[3].newerThan, new Date("2005").getTime())
          }, { fetchCommits: [[getFakeCommit()]] })
        })
      }
    })

    await t.step("choose the most recent if both latest sync & newerThan are present", async (t) => {
      for await (
        const client of yieldGithubClient({
          syncInfos: [{ type: "commit", createdAt: new Date("2005").getTime(), updatedAt: new Date("2005").getTime() }],
        })
      ) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchCommitsStub }) => {
            await client.syncCommits({ newerThan: new Date("2010").getTime() })
            assertEquals(fetchCommitsStub.calls[0].args[3].newerThan, new Date("2010").getTime())
          }, {
            fetchCommits: [[getFakeCommit()]],
          })
        })
      }
      for await (
        const client of yieldGithubClient({
          syncInfos: [{ type: "commit", createdAt: new Date("2010").getTime(), updatedAt: new Date("2010").getTime() }],
        })
      ) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchCommitsStub }) => {
            await client.syncCommits({ newerThan: new Date("2005").getTime() })
            assertEquals(fetchCommitsStub.calls[0].args[3].newerThan, new Date("2010").getTime())
          }, {
            fetchCommits: [[getFakeCommit()]],
          })
        })
      }
    })
  })

  await t.step("#syncActionRuns", async (t) => {
    await t.step("should sync using the client's owner, repo, and token", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchActionRunsStub }) => {
            await client.syncActionRuns()

            assertSpyCalls(fetchActionRunsStub, 1)
            assertObjectMatch(fetchActionRunsStub.calls[0].args, {
              "0": "owner",
              "1": "repo",
              "2": "token",
            })
          }, {
            fetchActionRuns: [[getFakeActionRun()]],
          })
        })
      }
    })

    await t.step("should sync only newer than specified time", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchActionRunsStub }) => {
            await client.syncActionRuns({ newerThan: 10 })
            assertSpyCalls(fetchActionRunsStub, 1)
            assertObjectMatch(fetchActionRunsStub.calls[0].args, {
              "3": { newerThan: 10 },
            })
          }, { fetchActionRuns: [[getFakeActionRun()]] })
        })
      }
    })

    await t.step("should add fetched items to cache", async (t) => {
      for await (const client of yieldGithubClient()) {
        const run = getFakeActionRun()
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async () => {
            await client.syncActionRuns()
            assertEquals(await asyncToArray(client.findActionRuns()), [run])
          }, { fetchActionRuns: [[run]] })
        })
      }
    })

    await t.step("should upsert fetched items", async (t) => {
      const run1 = getFakeActionRun({ node_id: "1" })
      const run2 = getFakeActionRun({ node_id: "2" })
      for await (const client of yieldGithubClient({ actionRuns: [run1, run2] })) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async () => {
            await client.syncActionRuns()
            assertEquals(await asyncToArray(client.findActionRuns()), [run1, run2])
          }, { fetchActionRuns: [[run2]] })
        })
      }
    })

    await t.step("should leave an unfinished sync marker if sync fails", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async () => {
            await withInternalsStubs(async () => {
              await assertRejects(() => client.syncActionRuns())
              assertEquals(await client.findLatestSync({ type: "action-run", includeUnfinished: true }), {
                type: "action-run",
                createdAt: 10_000,
              })
            }, {
              async *fetchActionRuns() {
                yield getFakeActionRun()
                throw new Error("oh noes")
              },
            })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should create a sync marker", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async () => {
            await withInternalsStubs(async () => {
              await client.syncActionRuns()
              assertEquals(await client.findLatestSync({ type: "action-run" }), {
                type: "action-run",
                createdAt: 10_000,
                updatedAt: 10_000,
              })
            }, { fetchActionRuns: [[getFakeActionRun()]] })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should return syncedAt", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async (t) => {
            await withInternalsStubs(async () => {
              const result = await client.syncActionRuns()
              assertEquals(result.syncedAt, 10_000)
            }, {
              async *fetchActionRuns() {
                await t.tickAsync(1000)
                yield getFakeActionRun()
              },
            })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should react to abort", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          const run1 = getFakeActionRun({ node_id: "1" })
          const run2 = getFakeActionRun({ node_id: "2" })
          await withInternalsStubs(async () => {
            await assertRejects(() => client.syncActionRuns({ signal: AbortSignal.timeout(1) }), AbortError)
            assertEquals(await asyncToArray(client.findActionRuns()), [run1])
          }, {
            async *fetchActionRuns() {
              yield run1
              await sleep(5)
              yield run2
            },
          })
        })
      }
    })

    await t.step("should respect newerThan", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchActionRunsStub }) => {
            await client.syncActionRuns({ newerThan: new Date("2000").getTime() })
            assertEquals(fetchActionRunsStub.calls[0].args[3].newerThan, new Date("2000").getTime())
          }, {
            fetchActionRuns: [[getFakeActionRun()]],
          })
        })
      }
    })

    await t.step("should sync to latest fully completed sync", async (t) => {
      for await (
        const client of yieldGithubClient({
          syncInfos: [
            { type: "action-run", createdAt: new Date("2000").getTime(), updatedAt: new Date("2000").getTime() },
            { type: "action-run", createdAt: new Date("2005").getTime(), updatedAt: new Date("2005").getTime() },
            // ↑ 🎉 2005 is the most recent & finished & pull sync
            { type: "commit", createdAt: new Date("2010").getTime(), updatedAt: new Date("2010").getTime() },
            { type: "action-run", createdAt: new Date("2015").getTime() },
          ],
        })
      ) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchActionRunsStub }) => {
            await client.syncActionRuns()
            assertEquals(fetchActionRunsStub.calls[0].args[3].newerThan, new Date("2005").getTime())
          }, {
            fetchActionRuns: [[getFakeActionRun()]],
          })
        })
      }
    })

    await t.step("choose the most recent if both latest sync & newerThan are present", async (t) => {
      for await (
        const client of yieldGithubClient({
          syncInfos: [{
            type: "action-run",
            createdAt: new Date("2005").getTime(),
            updatedAt: new Date("2005").getTime(),
          }],
        })
      ) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchActionRunsStub }) => {
            await client.syncActionRuns({ newerThan: new Date("2010").getTime() })
            assertEquals(fetchActionRunsStub.calls[0].args[3].newerThan, new Date("2010").getTime())
          }, {
            fetchActionRuns: [[getFakeActionRun()]],
          })
        })
      }
      for await (
        const client of yieldGithubClient({
          syncInfos: [{
            type: "action-run",
            createdAt: new Date("2010").getTime(),
            updatedAt: new Date("2010").getTime(),
          }],
        })
      ) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchActionRunsStub }) => {
            await client.syncActionRuns({ newerThan: new Date("2005").getTime() })
            assertEquals(fetchActionRunsStub.calls[0].args[3].newerThan, new Date("2010").getTime())
          }, {
            fetchActionRuns: [[getFakeActionRun()]],
          })
        })
      }
    })
  })

  await t.step("#syncActionWorkflows", async (t) => {
    await t.step("should sync using the client's owner, repo, and token", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async ({ fetchActionWorkflowsStub }) => {
            await client.syncActionWorkflows()

            assertSpyCalls(fetchActionWorkflowsStub, 1)
            assertObjectMatch(fetchActionWorkflowsStub.calls[0].args, {
              "0": "owner",
              "1": "repo",
              "2": "token",
            })
          }, {
            fetchActionWorkflows: [[getFakeActionWorkflow()]],
          })
        })
      }
    })

    await t.step("should add fetched items to cache", async (t) => {
      for await (const client of yieldGithubClient()) {
        const workflow = getFakeActionWorkflow()
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async () => {
            await client.syncActionWorkflows()
            assertEquals(await asyncToArray(client.findActionWorkflows()), [workflow])
          }, { fetchActionWorkflows: [[workflow]] })
        })
      }
    })

    await t.step("should upsert fetched items", async (t) => {
      const workflow1 = getFakeActionWorkflow({ node_id: "1" })
      const workflow2 = getFakeActionWorkflow({ node_id: "2" })
      for await (const client of yieldGithubClient({ actionWorkflows: [workflow1, workflow2] })) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async () => {
            await client.syncActionWorkflows()
            assertEquals(await asyncToArray(client.findActionWorkflows()), [workflow1, workflow2])
          }, { fetchActionWorkflows: [[workflow2]] })
        })
      }
    })

    await t.step("should leave an unfinished sync marker if sync fails", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async () => {
            await withInternalsStubs(async () => {
              await assertRejects(() => client.syncActionWorkflows())
              assertEquals(await client.findLatestSync({ type: "action-workflow", includeUnfinished: true }), {
                type: "action-workflow",
                createdAt: 10_000,
              })
            }, {
              async *fetchActionWorkflows() {
                yield getFakeActionWorkflow()
                throw new Error("oh noes")
              },
            })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should create a sync marker", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async () => {
            await withInternalsStubs(async () => {
              await client.syncActionWorkflows()
              assertEquals(await client.findLatestSync({ type: "action-workflow" }), {
                type: "action-workflow",
                createdAt: 10_000,
                updatedAt: 10_000,
              })
            }, { fetchActionWorkflows: [[getFakeActionWorkflow()]] })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should return syncedAt", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async (t) => {
            await withInternalsStubs(async () => {
              const result = await client.syncActionWorkflows()
              assertEquals(result.syncedAt, 10_000)
            }, {
              async *fetchActionWorkflows() {
                await t.tickAsync(1000)
                yield getFakeActionWorkflow()
              },
            })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should react to abort", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          const workflow1 = getFakeActionWorkflow({ node_id: "1" })
          const workflow2 = getFakeActionWorkflow({ node_id: "2" })
          await withInternalsStubs(async () => {
            await assertRejects(() => client.syncActionWorkflows({ signal: AbortSignal.timeout(1) }), AbortError)
            assertEquals(await asyncToArray(client.findActionWorkflows()), [workflow1])
          }, {
            async *fetchActionWorkflows() {
              yield workflow1
              await sleep(5)
              yield workflow2
            },
          })
        })
      }
    })
  })
})
