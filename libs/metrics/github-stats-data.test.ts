import { assertEquals } from "dev:asserts"

import { getFakeGithubStatsParticipation } from "../github/api/stats-participation/mod.ts"

import { createFakeReadonlyGithubClient, getFakeSyncInfo } from "../github/testing/mod.ts"

import { asyncToArray } from "../utils/mod.ts"

import { yieldStatsParticipation } from "./github-stats-data.ts"

Deno.test("yieldStatsParticipation", async (t) => {
  await t.step("", async () => {
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
