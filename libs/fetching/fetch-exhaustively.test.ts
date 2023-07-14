import { z } from "zod"
import { assertEquals, assertRejects } from "dev:asserts"

import { CannedResponses } from "../dev-utils.ts"

import { asyncToArray } from "../utils/mod.ts"

import { fetchExhaustively, FetchExhaustivelyOpts } from "./fetch-exhaustively.ts"

Deno.test("fetchExhaustively", async (t) => {
  const paginationCallback: FetchExhaustivelyOpts["paginationCallback"] = (opts) => {
    const link = opts.response.headers.get("link")
    if (!link) return undefined
    return new Request(opts.request, { headers: { link } })
  }

  function getCan() {
    return new CannedResponses([
      new Response("1", { status: 200, headers: { link: "2" } }),
      new Response("2", { status: 200, headers: { link: "3" } }),
      new Response("3", { status: 200 }),
    ])
  }

  await t.step("fetches paginated responses", async () => {
    const [r1, r2, r3] = await asyncToArray(
      fetchExhaustively(new Request("https://example.com"), z.string(), {
        _fetch: getCan().fetch,
        paginationCallback: paginationCallback,
      }),
    )
    assertEquals(r1.data, "1")
    assertEquals(r2.data, "2")
    assertEquals(r3.data, "3")
  })

  await t.step("paginates up to max pages", async () => {
    const iter = fetchExhaustively(new Request("https://example.com"), z.string(), {
      _fetch: getCan().fetch,
      maxPages: 2,
      paginationCallback: paginationCallback,
    })
    assertEquals((await iter.next()).value.data, "1")
    assertEquals((await iter.next()).value.data, "2")
    await assertRejects(() => iter.next(), Error, "cannot fetch more than 2 pages exhaustively")
  })
})
