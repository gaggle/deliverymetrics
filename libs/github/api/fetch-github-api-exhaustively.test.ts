import { assertEquals } from "dev:asserts"
import { z } from "zod"

import { asyncToArray } from "../../utils/mod.ts"

import { CannedResponses } from "../../../utils/dev-utils.ts"

import { fetchGithubApiExhaustively } from "./fetch-github-api-exhaustively.ts"

Deno.test("fetch-github-api-exhaustively", async (t) => {
  function getCan() {
    return new CannedResponses([
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
  }

  await t.step("paginates through GitHub header links", async () => {
    const [r1, r2, r3] = await asyncToArray(fetchGithubApiExhaustively(
      new Request("https://example.com"),
      z.string(),
      { _fetch: getCan().fetch, maxRetries: 0 },
    ))
    assertEquals(r1.data, "1")
    assertEquals(r2.data, "2")
    assertEquals(r3.data, "3")
  })
})
