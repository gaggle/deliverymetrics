import { assertEquals, assertObjectMatch, assertRejects } from "dev:asserts"
import { assertSpyCalls, returnsNext, Stub, stub } from "dev:mock"
import { FakeTime } from "dev:time"

import { arrayToAsyncGenerator, asyncToArray, sleep } from "../../utils/mod.ts"

import { withFakeTime, withStubs } from "../../dev-utils.ts"
import { AbortError } from "../../errors.ts"

import { getFakeGithubActionRun, GithubActionRun } from "../api/action-run/mod.ts"
import { getFakeGithubActionWorkflow, GithubActionWorkflow } from "../api/action-workflows/mod.ts"
import { getFakeGithubCommit, GithubCommit } from "../api/commits/mod.ts"
import { BoundGithubPullCommit, getFakeGithubPullCommit } from "../api/pull-commits/mod.ts"
import { getFakeGithubPull, GithubPull } from "../api/pulls/mod.ts"

import { GithubClient, SyncInfo } from "../types/mod.ts"

import { createFakeGithubClient, getFakeSyncInfo } from "../testing/mod.ts"

import { _internals } from "./aloe-github-client.ts"

async function* yieldGithubClient(
  opts?: Partial<{
    actionRuns: Array<GithubActionRun>
    actionWorkflows: Array<GithubActionWorkflow>
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
    fetchActionRuns: InternalsStubData<GithubActionRun | Error>
    fetchActionWorkflows: InternalsStubData<GithubActionWorkflow | Error>
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
      "fetchGithubActionRuns",
      returnsNext(resolve(opts.fetchActionRuns)),
    ),
    fetchActionWorkflowsStub: stub(
      _internals,
      "fetchGithubActionWorkflows",
      returnsNext(resolve(opts.fetchActionWorkflows)),
    ),
    fetchCommitsStub: stub(
      _internals,
      "fetchGithubCommits",
      returnsNext(resolve(opts.fetchCommits)),
    ),
    fetchPullCommitsStub: stub(
      _internals,
      "fetchGithubPullCommits",
      returnsNext(resolve(opts.fetchPullCommits)),
    ),
    fetchPullsStub: stub(
      _internals,
      "fetchGithubPulls",
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
            fetchPulls: [[getFakeGithubPull({ commits_url: "https://commits_url" })]],
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
          }, { fetchPulls: [[getFakeGithubPull()]] })
        })
      }
    })

    await t.step("should add fetched items to cache", async (t) => {
      for await (const client of yieldGithubClient()) {
        const fakePull = getFakeGithubPull()
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async () => {
            await client.syncPulls()
            assertEquals(await asyncToArray(client.findPulls()), [fakePull])
          }, { fetchPulls: [[fakePull]] })
        })
      }
    })

    await t.step("should upsert fetched items", async (t) => {
      const fakePull1 = getFakeGithubPull({ number: 1 })
      const fakePull2 = getFakeGithubPull({ number: 2 })
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
                yield getFakeGithubPull()
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
            }, { fetchPulls: [[getFakeGithubPull()]] })
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
                yield getFakeGithubPull()
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
            const fakePull = getFakeGithubPull()
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
          const pull1 = getFakeGithubPull({ number: 1 })
          const pull2 = getFakeGithubPull({ number: 2 })
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
            fetchPulls: [[getFakeGithubPull()]],
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
            fetchPulls: [[getFakeGithubPull()]],
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
            fetchPulls: [[getFakeGithubPull()]],
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
            fetchPulls: [[getFakeGithubPull()]],
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
            await client.syncPullCommits([getFakeGithubPull({ number: 2 })])

            assertSpyCalls(fetchPullCommitsStub, 1)
            assertObjectMatch(fetchPullCommitsStub.calls[0].args, {
              "0": { commits_url: "https://api.github.com/repos/octocat/Hello-World/pulls/2/commits" },
              "1": "token",
            })
          }, {
            fetchPullCommits: [[getFakeGithubPullCommit()]],
          })
        })
      }
    })

    await t.step("should add fetched items to cache", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async () => {
            await client.syncPullCommits([getFakeGithubPull({ number: 2 })])
            assertEquals(await asyncToArray(client.findPullCommits({ pr: 2 })), [getFakeGithubPullCommit({ pr: 2 })])
          }, { fetchPullCommits: [arrayToAsyncGenerator([getFakeGithubPullCommit()])] })
        })
      }
    })

    await t.step("should upsert fetched items", async (t) => {
      const fakeCommit1 = getFakeGithubPullCommit({ pr: 1 })
      const fakePull = getFakeGithubPull({ number: 2 })
      const fakeCommit2 = getFakeGithubPullCommit({ pr: 2 })
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
          }, { fetchPullCommits: [arrayToAsyncGenerator([getFakeGithubPullCommit()])] })
        })
      }
    })

    await t.step("should leave an unfinished sync marker if sync fails", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async () => {
            await withInternalsStubs(async () => {
              await assertRejects(() => client.syncPullCommits([getFakeGithubPull()]))

              assertEquals(await client.findLatestSync({ type: "pull-commit", includeUnfinished: true }), {
                type: "pull-commit",
                createdAt: 10_000,
              })
            }, {
              fetchPullCommits: [[getFakeGithubPullCommit(), new Error("oh noes")]],
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
              await client.syncPullCommits([getFakeGithubPull()])
              assertEquals(await client.findLatestSync({ type: "pull-commit" }), {
                type: "pull-commit",
                createdAt: 10_000,
                updatedAt: 10_000,
              })
            }, { fetchPullCommits: [arrayToAsyncGenerator([getFakeGithubPullCommit()])] })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should return syncedAt", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          await withFakeTime(async (t) => {
            await withInternalsStubs(async () => {
              const result = await client.syncPullCommits([getFakeGithubPull()])
              assertEquals(result.syncedAt, 10_000)
            }, {
              async *fetchPullCommits() {
                await t.tickAsync(1000)
                yield getFakeGithubPullCommit()
              },
            })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should react to abort", async (t) => {
      const pull1 = getFakeGithubPull({ number: 1 })
      const pullCommit1 = getFakeGithubPullCommit({ pr: pull1.number, node_id: "1a" })
      const pullCommit2 = getFakeGithubPullCommit({ pr: pull1.number, node_id: "1b" })
      async function* fetchPullCommits1() {
        await sleep(5)
        yield pullCommit1
        await sleep(5)
        yield pullCommit2
      }

      const pull2 = getFakeGithubPull({ number: 2 })
      async function* fetchPullCommits2() {
        await sleep(5)
        yield getFakeGithubPullCommit({ pr: pull2.number, node_id: "2a" })
        await sleep(5)
        yield getFakeGithubPullCommit({ pr: pull2.number, node_id: "2b" })
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
            fetchCommits: [[getFakeGithubCommit()]],
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
          }, { fetchCommits: [[getFakeGithubCommit()]] })
        })
      }
    })

    await t.step("should add fetched items to cache", async (t) => {
      for await (const client of yieldGithubClient()) {
        const fakeCommit = getFakeGithubCommit()
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async () => {
            await client.syncCommits()
            assertEquals(await asyncToArray(client.findCommits()), [fakeCommit])
          }, { fetchCommits: [[fakeCommit]] })
        })
      }
    })

    await t.step("should upsert fetched items", async (t) => {
      const fakeCommit1 = getFakeGithubCommit({ sha: "1", node_id: "1" })
      const fakeCommit2 = getFakeGithubCommit({ sha: "2", node_id: "2" })
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
                yield getFakeGithubCommit()
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
            }, { fetchCommits: [[getFakeGithubCommit()]] })
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
                yield getFakeGithubCommit()
              },
            })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should react to abort", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          const commit1 = getFakeGithubCommit({ node_id: "1" })
          const commit2 = getFakeGithubCommit({ node_id: "2" })
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
          }, { fetchCommits: [[getFakeGithubCommit()]] })
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
          }, { fetchCommits: [[getFakeGithubCommit()]] })
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
            fetchCommits: [[getFakeGithubCommit()]],
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
            fetchCommits: [[getFakeGithubCommit()]],
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
            fetchActionRuns: [[getFakeGithubActionRun()]],
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
          }, { fetchActionRuns: [[getFakeGithubActionRun()]] })
        })
      }
    })

    await t.step("should add fetched items to cache", async (t) => {
      for await (const client of yieldGithubClient()) {
        const run = getFakeGithubActionRun()
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async () => {
            await client.syncActionRuns()
            assertEquals(await asyncToArray(client.findActionRuns()), [run])
          }, { fetchActionRuns: [[run]] })
        })
      }
    })

    await t.step("should upsert fetched items", async (t) => {
      const run1 = getFakeGithubActionRun({ node_id: "1" })
      const run2 = getFakeGithubActionRun({ node_id: "2" })
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
                yield getFakeGithubActionRun()
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
            }, { fetchActionRuns: [[getFakeGithubActionRun()]] })
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
                yield getFakeGithubActionRun()
              },
            })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should react to abort", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          const run1 = getFakeGithubActionRun({ node_id: "1" })
          const run2 = getFakeGithubActionRun({ node_id: "2" })
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
            fetchActionRuns: [[getFakeGithubActionRun()]],
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
            fetchActionRuns: [[getFakeGithubActionRun()]],
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
            fetchActionRuns: [[getFakeGithubActionRun()]],
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
            fetchActionRuns: [[getFakeGithubActionRun()]],
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
            fetchActionWorkflows: [[getFakeGithubActionWorkflow()]],
          })
        })
      }
    })

    await t.step("should add fetched items to cache", async (t) => {
      for await (const client of yieldGithubClient()) {
        const workflow = getFakeGithubActionWorkflow()
        await t.step(`for ${client.constructor.name}`, async () => {
          await withInternalsStubs(async () => {
            await client.syncActionWorkflows()
            assertEquals(await asyncToArray(client.findActionWorkflows()), [workflow])
          }, { fetchActionWorkflows: [[workflow]] })
        })
      }
    })

    await t.step("should upsert fetched items", async (t) => {
      const workflow1 = getFakeGithubActionWorkflow({ node_id: "1" })
      const workflow2 = getFakeGithubActionWorkflow({ node_id: "2" })
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
                yield getFakeGithubActionWorkflow()
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
            }, { fetchActionWorkflows: [[getFakeGithubActionWorkflow()]] })
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
                yield getFakeGithubActionWorkflow()
              },
            })
          }, new FakeTime(10_000))
        })
      }
    })

    await t.step("should react to abort", async (t) => {
      for await (const client of yieldGithubClient()) {
        await t.step(`for ${client.constructor.name}`, async () => {
          const workflow1 = getFakeGithubActionWorkflow({ node_id: "1" })
          const workflow2 = getFakeGithubActionWorkflow({ node_id: "2" })
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
