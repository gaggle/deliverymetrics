import { assertEquals, assertObjectMatch } from "dev:asserts"

import { asyncToArray, single } from "../../utils/mod.ts"

import { getFakeGithubActionRun } from "../github/api/action-run/mod.ts"
import { createFakeReadonlyGithubClient, getFakeSyncInfo } from "../github/testing/mod.ts"

import { yieldContinuousIntegrationHistogram } from "./histogram-ci.ts"

Deno.test("regarding the shape of an entry", async (t) => {
  await t.step("given workflow runs in a single day", async (t) => {
    const github = await createFakeReadonlyGithubClient({
      actionRuns: [
        getFakeGithubActionRun({
          id: 1,
          html_url: "example.org/1",
          path: "foo.yml",
          created_at: "2022-01-01T09:00:00Z",
          updated_at: "2022-01-01T10:00:00Z",
          head_branch: "foo",
          conclusion: "success",
        }),
        getFakeGithubActionRun({
          id: 2,
          html_url: "example.org/2",
          path: "foo.yml",
          created_at: "2022-01-01T19:00:00Z",
          updated_at: "2022-01-01T20:00:00Z",
          head_branch: "master",
          conclusion: "failure",
        }),
        getFakeGithubActionRun({
          id: 3,
          html_url: "example.org/2",
          path: "bar.yml",
          created_at: "2022-01-01T23:00:00Z",
          updated_at: "2022-01-01T23:00:00Z",
          head_branch: "main",
          conclusion: "cancelled",
        }),
      ],
      syncInfos: [getFakeSyncInfo({
        type: "action-run",
        updatedAt: new Date("2022-01-01T20:10:05Z").getTime(),
        createdAt: new Date("2022-01-01T20:10:00Z").getTime(),
      })],
    })

    const result = await asyncToArray(yieldContinuousIntegrationHistogram(github, { mode: "daily" }))

    await t.step("it calculates a single entry", () => assertEquals(result.length, 1))

    const entry = single(result)

    await t.step(
      "it defines the start and end of that day",
      () =>
        assertEquals({ start: entry.start, end: entry.end }, {
          start: new Date("2022-01-01T00:00:00.000Z"),
          end: new Date("2022-01-01T23:59:59.999Z"),
        }),
    )

    await t.step("it finds the IDs", () => assertObjectMatch(entry, { count: 3, ids: [1, 2, 3] }))

    await t.step(
      "it finds htmlUrls",
      () => assertObjectMatch(entry, { htmlUrls: ["example.org/1", "example.org/2"] }),
    )

    await t.step(
      "it finds and sorts conclusions",
      () => assertObjectMatch(entry, { conclusions: ["cancelled", "failure", "success"] }),
    )

    await t.step(
      "it finds and dedupes branches",
      () => assertObjectMatch(entry, { branches: ["foo", "main"] }),
    )

    await t.step(
      "it finds and dedupes paths",
      () => assertObjectMatch(entry, { paths: ["bar.yml", "foo.yml"] }),
    )

    await t.step("it finds and counts IDs for each status", () =>
      assertObjectMatch(entry, {
        failureCount: 1,
        failureIds: [2],
        successCount: 1,
        successIds: [1],
      }))
  })
})

Deno.test("for daily histogram", async (t) => {
  await t.step("calculates two entries for two workflow runs on different days", async () => {
    const github = await createFakeReadonlyGithubClient({
      actionRuns: [
        getFakeGithubActionRun({
          id: 1,
          created_at: "2022-01-01T23:00:00Z",
          updated_at: "2022-01-01T23:59:59Z",
        }),
        getFakeGithubActionRun({
          id: 2,
          created_at: "2022-01-02T00:00:00Z",
          updated_at: "2022-01-02T00:00:01Z",
        }),
      ],
      syncInfos: [getFakeSyncInfo({
        type: "action-run",
        updatedAt: new Date("2022-01-02T20:10:05Z").getTime(),
        createdAt: new Date("2022-01-02T20:10:00Z").getTime(),
      })],
    })

    const result = await asyncToArray(yieldContinuousIntegrationHistogram(github, { mode: "daily" }))

    assertEquals(result.length, 2)
  })

  await t.step("stops yielding at max days old since sync", async () => {
    const github = await createFakeReadonlyGithubClient({
      actionRuns: [
        getFakeGithubActionRun({
          id: 1,
          created_at: "2022-01-01T00:00:00Z",
          updated_at: "2022-01-01T00:00:00Z",
        }),
        getFakeGithubActionRun({
          id: 2,
          created_at: "2022-01-02T00:00:00Z",
          updated_at: "2022-01-02T00:00:00Z",
        }),
      ],
      syncInfos: [getFakeSyncInfo({
        type: "action-run",
        createdAt: new Date("2022-01-02T20:00:00Z").getTime(),
        updatedAt: new Date("2022-01-02T20:00:10Z").getTime(),
      })],
    })

    const entry = single(
      await asyncToArray(yieldContinuousIntegrationHistogram(github, {
        mode: "daily",
        maxDays: 1,
      })),
    )

    assertObjectMatch(entry, { ids: [2] })
  })
})

Deno.test("for weekly histogram", async (t) => {
  await t.step("calculates one entry for two workflow runs in the same week", async () => {
    const github = await createFakeReadonlyGithubClient({
      actionRuns: [
        getFakeGithubActionRun({
          id: 1,
          created_at: "2022-01-03T00:00:00Z",
          updated_at: "2022-01-03T00:00:00Z",
        }),
        getFakeGithubActionRun({
          id: 2,
          created_at: "2022-01-04T00:00:00Z",
          updated_at: "2022-01-04T00:00:00Z",
        }),
      ],
      syncInfos: [getFakeSyncInfo({
        type: "action-run",
        createdAt: new Date("2022-01-04T20:00:00Z").getTime(),
        updatedAt: new Date("2022-01-04T20:00:10Z").getTime(),
      })],
    })

    const result = await asyncToArray(yieldContinuousIntegrationHistogram(github, { mode: "weekly" }))

    assertEquals(
      result.map((el) => ({ start: el.start, end: el.end })),
      [{
        start: new Date("2022-01-03T00:00:00.000Z"),
        end: new Date("2022-01-09T23:59:59.999Z"),
      }],
    )
  })
})

Deno.test("for monthly histogram", async (t) => {
  await t.step("calculates one entry for two workflow runs in the same month", async () => {
    const github = await createFakeReadonlyGithubClient({
      actionRuns: [
        getFakeGithubActionRun({
          id: 1,
          created_at: "2022-01-03T00:00:00Z",
          updated_at: "2022-01-03T00:00:00Z",
        }),
        getFakeGithubActionRun({
          id: 2,
          created_at: "2022-01-31T00:00:00Z",
          updated_at: "2022-01-31T00:00:00Z",
        }),
      ],
      syncInfos: [getFakeSyncInfo({
        type: "action-run",
        createdAt: new Date("2022-01-31T20:00:00Z").getTime(),
        updatedAt: new Date("2022-01-31T20:00:10Z").getTime(),
      })],
    })

    const result = await asyncToArray(yieldContinuousIntegrationHistogram(github, { mode: "monthly" }))

    assertEquals(
      result.map((el) => ({ start: el.start, end: el.end })),
      [{
        start: new Date("2022-01-01T00:00:00.000Z"),
        end: new Date("2022-01-31T23:59:59.999Z"),
      }],
    )
  })
})

Deno.test("only yields matching branch", async () => {
  const github = await createFakeReadonlyGithubClient({
    actionRuns: [
      getFakeGithubActionRun({ id: 1, head_branch: "main" }),
      getFakeGithubActionRun({ id: 2, head_branch: "another_branch" }),
    ],
    syncInfos: [getFakeSyncInfo({ type: "action-run" })],
  })

  const entry = single(
    await asyncToArray(yieldContinuousIntegrationHistogram(github, {
      mode: "daily",
      branch: "main",
    })),
  )

  assertEquals(entry.ids, [1])
})

Deno.test("only yields matching conclusion", async (t) => {
  const github = await createFakeReadonlyGithubClient({
    actionRuns: [
      getFakeGithubActionRun({ id: 1, conclusion: "success" }),
      getFakeGithubActionRun({ id: 2, conclusion: "failure" }),
      getFakeGithubActionRun({ id: 3, conclusion: "cancelled" }),
    ],
    syncInfos: [getFakeSyncInfo({ type: "action-run" })],
  })

  await t.step("with string", async () => {
    const entry = single(
      await asyncToArray(yieldContinuousIntegrationHistogram(github, {
        mode: "daily",
        conclusion: "success",
      })),
    )
    assertEquals(entry.ids, [1])
  })

  await t.step("with regex", async () => {
    const entry = single(
      await asyncToArray(yieldContinuousIntegrationHistogram(github, {
        mode: "daily",
        conclusion: /success|failure/,
      })),
    )
    assertEquals(entry.ids, [1, 2])
  })
})

Deno.test("only yields matching workflow path", async () => {
  const github = await createFakeReadonlyGithubClient({
    actionRuns: [
      getFakeGithubActionRun({ id: 1, path: "foo.yml" }),
      getFakeGithubActionRun({ id: 2, path: "bar.yml" }),
    ],
    syncInfos: [getFakeSyncInfo({ type: "action-run" })],
  })

  const entry = single(
    await asyncToArray(yieldContinuousIntegrationHistogram(github, {
      mode: "daily",
      workflow: { path: "foo.yml" },
    })),
  )

  assertEquals(entry.ids, [1])
})
