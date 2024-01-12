import { assertEquals } from "dev:asserts"
import { FakeTime } from "dev:time"

import { withFakeTime } from "../../utils/dev-utils.ts"

import { githubBackoff, rateLimitAwareBackoff } from "./rate-limit-aware-backoff.ts"

for (const fn of [rateLimitAwareBackoff, githubBackoff]) {
  Deno.test(`${fn.name} (shared tests)`, async (t) => {
    await t.step("delays on error", () => {
      const actual = fn({ attemptNumber: 0, error: new Error("stop") })
      assertEquals(typeof actual.delay, "number")
      assertEquals(actual.reason, "error: stop")
    })

    await t.step("delays on a 500", () => {
      const actual = fn({ attemptNumber: 0, response: new Response("💥", { status: 500 }) })
      assertEquals(typeof actual.delay, "number")
      assertEquals(actual.reason, "status code: 500")
    })

    await t.step("does not delay on a 400", () => {
      const actual = fn({ attemptNumber: 0, response: new Response("💥", { status: 400 }) })
      assertEquals(typeof actual.delay, "undefined")
      assertEquals(actual.reason, "don't retry status code: 400")
    })
  })
}

for (const fn of [rateLimitAwareBackoff, githubBackoff]) {
  Deno.test(`${fn.name} (rate limit tests)`, async (t) => {
    await t.step("calculates time until next reset", async () => {
      const noon = new Date("1970-01-01T12:00:00.000Z").getTime()
      await withFakeTime(() => {
        const result = fn({
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
        assertEquals(result.delay, 30 * 60 * 1000)
        // ↑                 min  s    ms
        assertEquals(result.reason, "rate-limited")
      }, new FakeTime(new Date("1970-01-01T11:30:00.000Z")))
    })

    await t.step("avoids negative delays if header comes back with a wacky time", async () => {
      await withFakeTime(() => {
        const result = fn({
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
        assertEquals(result.delay, 0)
        assertEquals(result.reason, "rate-limited")
      }, new FakeTime(new Date("1980-01-01T22:00:00.000Z")))
    })

    await t.step("does not delay a 403 that has no ratelimit header", () => {
      const actual = fn({
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
      })
      assertEquals(actual.delay, undefined)
      assertEquals(actual.reason, "don't retry status code: 403")
    })
  })
}

Deno.test("githubBackoff", async (t) => {
  await t.step("retries a 202", async () => {
    const actual = await githubBackoff({ attemptNumber: 0, response: new Response("💥", { status: 202 }) })
    assertEquals(typeof actual.delay, "number")
    assertEquals(actual.reason, "202 response")
  })

  await t.step("gives up on 422", async () => {
    const actual = await githubBackoff({ attemptNumber: 0, response: new Response("💥", { status: 422 }) })
    assertEquals(actual.delay, undefined)
    assertEquals(actual.reason, "unprocessable-entity")
  })
})
