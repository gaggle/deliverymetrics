import { z } from "zod"
import { assertEquals, assertRejects } from "dev:asserts"

import { CannedResponses } from "../dev-utils.ts"

import { asyncToArray } from "../utils/mod.ts"

import { fetchExhaustively } from "./fetch-exhaustively.ts"

Deno.test("fetchExhaustively", async (t) => {
  await t.step("fetches paginated responses", async () => {
    const can = new CannedResponses([
      new Response("1", {
        status: 200,
        headers: {
          link: `<https://x/pulls?page=2>; rel="next", <https://x/pulls?page=3>; rel="last"`,
        },
      }),
      new Response("2", {
        status: 200,
        headers: {
          link: `<https://x/pulls?page=3>; rel="next", <https://x/pulls?page=3>; rel="last"`,
        },
      }),
      new Response("3", { status: 200 }),
    ])
    const [r1, r2, r3] = await asyncToArray(
      fetchExhaustively(new Request("https://example.com"), z.any(), { _fetch: can.fetch }),
    )
    assertEquals(r1.data, "1")
    assertEquals(r2.data, "2")
    assertEquals(r3.data, "3")
  })

  await t.step("paginates up to max pages", async () => {
    const can = new CannedResponses([
      new Response("1", {
        status: 200,
        headers: {
          link: `<https://x/pulls?page=2>; rel="next", <https://x/pulls?page=3>; rel="last"`,
        },
      }),
      new Response("2", {
        status: 200,
        headers: {
          link: `<https://x/pulls?page=3>; rel="next", <https://x/pulls?page=3>; rel="last"`,
        },
      }),
      new Response("3", { status: 200 }),
    ])
    const iter = fetchExhaustively(new Request("https://example.com"), z.any(), { _fetch: can.fetch, maxPages: 2 })
    assertEquals((await iter.next()).value.data, "1")
    assertEquals((await iter.next()).value.data, "2")
    await assertRejects(() => iter.next(), Error, "cannot fetch more than 2 pages exhaustively")
  })
})
