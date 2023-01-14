import { assertEquals } from "dev:asserts";

import { getFakePull, getFakePullCommit } from "../testing.ts";

import { sortPullCommitsByKey, sortPullsByKey } from "./sorting.ts";

Deno.test("sortPullsByKey", async (t) => {
  await t.step("should sort by created_at by default", function () {
    const fakePull1 = getFakePull({ created_at: "1999-01-01T00:00:00Z" });
    const fakePull2 = getFakePull({ created_at: "2000-01-01T00:00:00Z" });
    assertEquals(sortPullsByKey([fakePull2, fakePull1]), [
      fakePull1,
      fakePull2,
    ]);
  });

  await t.step("should support sorting by updated_at", function () {
    const fakePull1 = getFakePull({
      created_at: "1999-01-01T00:00:00Z",
      updated_at: "2010-01-01T00:00:00Z",
    });
    const fakePull2 = getFakePull({
      created_at: "2000-01-01T00:00:00Z",
      updated_at: "2000-01-01T00:00:00Z",
    });
    assertEquals(sortPullsByKey([fakePull1, fakePull2], "updated_at"), [
      fakePull2,
      fakePull1,
    ]);
  });
});

Deno.test("sortPullCommitsByKey", async (t) => {
  await t.step("should sort by commit.author by default", function () {
    const a = getFakePullCommit({ pr: 1, commit: { author: { date: "1999-01-01T00:00:00Z" } } });
    const b = getFakePullCommit({ pr: 1, commit: { author: { date: "2000-01-01T00:00:00Z" } } });
    assertEquals(sortPullCommitsByKey([b, a]), [a, b]);
  });

  await t.step("should support sorting by commit.committer", function () {
    const a = getFakePullCommit({
      pr: 1,
      commit: { author: { date: "1999-01-01T00:00:00Z" }, committer: { date: "2010-01-01T00:00:00Z" } },
    });
    const b = getFakePullCommit({
      pr: 1,
      commit: { author: { date: "2000-01-01T00:00:00Z" }, committer: { date: "2000-01-01T00:00:00Z" } },
    });
    assertEquals(sortPullCommitsByKey([a, b], "commit.committer"), [b, a]);
  });
});
