import { assertEquals } from "dev:asserts"

import { getFakeGithubStatsParticipation } from "../github/api/stats-participation/mod.ts"
import { getFakeGithubStatsContributor } from "../github/api/stats-contributors/mod.ts"

import { createFakeReadonlyGithubClient, getFakeSyncInfo } from "../github/testing/mod.ts"

import { asyncToArray } from "../../utils/mod.ts"

import { yieldStatsContributors, yieldStatsParticipation } from "./github-stats-data.ts"

Deno.test("yieldStatsContributors", async (t) => {
  await t.step("filters to max days and recalculates total", async () => {
    const fakeContributor = getFakeGithubStatsContributor({
      total: 6,
      weeks: [
        { "w": getTimeInSec("2023-06-18"), "a": 1, "d": 1, "c": 1 },
        { "w": getTimeInSec("2023-06-25"), "a": 2, "d": 2, "c": 2 },
        { "w": getTimeInSec("2023-07-02"), "a": 3, "d": 3, "c": 3 },
      ],
    })
    const gh = await createFakeReadonlyGithubClient({
      syncInfos: [
        getFakeSyncInfo({
          type: "stats-contributors",
          createdAt: new Date("2023-07-02").getTime(),
          updatedAt: new Date("2023-07-02").getTime(),
        }),
      ],
      statsContributors: [fakeContributor],
    })
    assertEquals(await asyncToArray(yieldStatsContributors(gh, { maxDays: 7 })), [
      {
        contributors: {
          author: fakeContributor.author,
          total: 5,
          // ↑ total has been recalculated based on filtered weeks
          weeks: [
            { a: 2, c: 2, d: 2, w: getTimeInSec("2023-06-25") },
            { a: 3, c: 3, d: 3, w: getTimeInSec("2023-07-02") },
          ],
        },
      },
    ])
  })

  await t.step("fully removes entry if no weeks are left", async () => {
    const fakeContributor = getFakeGithubStatsContributor({
      total: 1,
      weeks: [{ "w": getTimeInSec("1999-06-18"), "a": 1, "d": 1, "c": 1 }],
    })
    const gh = await createFakeReadonlyGithubClient({
      syncInfos: [
        getFakeSyncInfo({
          type: "stats-contributors",
          createdAt: new Date("2023-07-02").getTime(),
          updatedAt: new Date("2023-07-02").getTime(),
        }),
      ],
      statsContributors: [fakeContributor],
    })
    assertEquals(await asyncToArray(yieldStatsContributors(gh, { maxDays: 1 })), [])
  })
})

Deno.test("yieldStatsParticipation", async (t) => {
  await t.step("calculates properties correctly", async () => {
    const gh = await createFakeReadonlyGithubClient({
      syncInfos: [
        getFakeSyncInfo({
          type: "stats-participation",
          createdAt: new Date("1980-01-25 12:00:000Z").getTime(),
          updatedAt: new Date("1980-01-25 12:00:000Z").getTime(),
        }),
      ],
      statsParticipation: [getFakeGithubStatsParticipation({ all: [3, 2, 1], owner: [2, 1, 0] })],
    })
    assertEquals(await asyncToArray(yieldStatsParticipation(gh)), [{
      totalCommitsPerWeek: [3, 2, 1],
      ownerCommitsPerWeek: [2, 1, 0],
      nonOwnerCommitsPerWeek: [1, 1, 1],
      weekDates: [
        { start: new Date("1980-01-18 00:00:000Z"), end: new Date("1980-01-25 00:00:000Z") },
        { start: new Date("1980-01-11 00:00:000Z"), end: new Date("1980-01-18 00:00:000Z") },
        { start: new Date("1980-01-04 00:00:000Z"), end: new Date("1980-01-11 00:00:000Z") },
      ],
    }])
  })
})

function getTimeInSec(value: string) {
  return new Date(value).getTime() / 1000
}
