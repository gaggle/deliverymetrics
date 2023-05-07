import { assertEquals } from "dev:asserts"

import { getFakeGithubPull } from "../api/pulls/mod.ts"
import { getFakeGithubPullCommit } from "../api/pull-commits/mod.ts"

import { sortPullCommitsByKey, sortPullsByKey } from "./sorting.ts"

Deno.test("sortPullsByKey", async (t) => {
  await t.step("should sort by created_at by default", function () {
    const fakePull1 = getFakeGithubPull({
      created_at: "1999-01-01T00:00:00Z",
      updated_at: "1990-01-01T00:00:00Z",
    })
    const fakePull2 = getFakeGithubPull({
      created_at: "2000-01-01T00:00:00Z",
      updated_at: "1991-01-01T00:00:00Z",
    })
    assertEquals(sortPullsByKey([fakePull2, fakePull1]), [
      fakePull1,
      fakePull2,
    ])
  })

  await t.step("should support sorting by updated_at", function () {
    const fakePull1 = getFakeGithubPull({
      created_at: "1999-01-01T00:00:00Z",
      updated_at: "2010-01-01T00:00:00Z",
    })
    const fakePull2 = getFakeGithubPull({
      created_at: "2000-01-01T00:00:00Z",
      updated_at: "2000-01-01T00:00:00Z",
    })
    assertEquals(sortPullsByKey([fakePull1, fakePull2], "updated_at"), [
      fakePull2,
      fakePull1,
    ])
  })
})

Deno.test("sortPullCommitsByKey", async (t) => {
  await t.step("should sort by commit.author by default", function () {
    const a = getFakeGithubPullCommit({ pr: 1, commit: { author: { date: "1999-01-01T00:00:00Z" } } })
    const b = getFakeGithubPullCommit({ pr: 1, commit: { author: { date: "2000-01-01T00:00:00Z" } } })
    assertEquals(sortPullCommitsByKey([b, a]), [a, b])
  })

  await t.step("should support sorting by commit.committer", function () {
    const a = getFakeGithubPullCommit({
      pr: 1,
      commit: { author: { date: "1999-01-01T00:00:00Z" }, committer: { date: "2010-01-01T00:00:00Z" } },
    })
    const b = getFakeGithubPullCommit({
      pr: 1,
      commit: { author: { date: "2000-01-01T00:00:00Z" }, committer: { date: "2000-01-01T00:00:00Z" } },
    })
    assertEquals(sortPullCommitsByKey([a, b], "commit.committer"), [b, a])
  })
})
