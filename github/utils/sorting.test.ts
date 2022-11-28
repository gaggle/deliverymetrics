import { assertEquals } from "dev:asserts";

import { getFakePull } from "../testing.ts";

import { sortPullsByKey } from "./sorting.ts";

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
