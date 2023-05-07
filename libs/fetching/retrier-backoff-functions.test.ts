import { assertEquals } from "dev:asserts"
import { FakeTime } from "dev:time"

import { withFakeTime } from "../dev-utils.ts"

import { exponentialBackoff, rateLimitAwareBackoff, simpleBackoff } from "./retrier-backoff-functions.ts"

for (const fn of [simpleBackoff, exponentialBackoff, rateLimitAwareBackoff]) {
  Deno.test(`${fn.name} (shared tests)`, async (t) => {
    await t.step("delays on error", async () => {
      assertEquals(typeof await fn({ attemptNumber: 0, error: new Error("😵") }), "number")
    })

    await t.step("delays on a 500", async () => {
      assertEquals(typeof await fn({ attemptNumber: 0, response: new Response("💥", { status: 500 }) }), "number")
    })

    await t.step("does not delay on a 400", async () => {
      assertEquals(await fn({ attemptNumber: 0, response: new Response("💥", { status: 400 }) }), undefined)
    })
  })
}

Deno.test("rateLimitAnd202AwareBackoff", async (t) => {
  await t.step("calculates time until next reset", async () => {
    const noon = new Date("1970-01-01T12:00:00.000Z").getTime()
    await withFakeTime(async () => {
      const result = await rateLimitAwareBackoff({
        attemptNumber: 0,
        response: new Response("💥", {
          status: 403,
          headers: {
            "x-ratelimit-limit": "60",
            "x-ratelimit-remaining": "0",
            "x-ratelimit-used": "60",
            "x-ratelimit-reset": (noon / 1000).toString(),
            // ↑ GitHub's ratelimit-reset is in seconds
          },
        }),
      })
      assertEquals(result, 30 * 60 * 1000)
      // ↑                 min  s    ms
    }, new FakeTime(new Date("1970-01-01T11:30:00.000Z")))
  })

  await t.step("avoids negative delays if header comes back with a wacky time", async () => {
    await withFakeTime(async () => {
      const result = await rateLimitAwareBackoff({
        attemptNumber: 0,
        response: new Response("💥", {
          status: 403,
          headers: {
            "x-ratelimit-limit": "60",
            "x-ratelimit-remaining": "0",
            "x-ratelimit-used": "60",
            "x-ratelimit-reset": (new Date("1979-01-01T00:00:00.000Z").getTime() / 1000).toString(),
            // ↑ GitHub's ratelimit-reset is in seconds
          },
        }),
      })
      assertEquals(result, 0)
    }, new FakeTime(new Date("1980-01-01T22:00:00.000Z")))
  })

  await t.step("does not delay a 403 that has no ratelimit header", async () => {
    assertEquals(
      await rateLimitAwareBackoff({
        attemptNumber: 0,
        response: new Response("💥", {
          status: 403,
          headers: {
            "x-ratelimit-limit": "60",
            "x-ratelimit-remaining": "0",
            "x-ratelimit-used": "60",
            // Somehow 'x-ratelimit-reset' header is missing
          },
        }),
      }),
      undefined,
    )
  })

  await t.step("retries a 202", async () => {
    assertEquals(
      typeof await rateLimitAwareBackoff({ attemptNumber: 0, response: new Response("💥", { status: 202 }) }),
      "number",
    )
  })
})
