import { assertEquals, assertRejects } from "dev:asserts"
import { assertSpyCalls, Spy, spy } from "dev:mock"

import { CannedResponses, withMockedFetch } from "../dev-utils.ts"

import { fetchWithRetry, FetchWithRetryProgress } from "./fetch-with-retry.ts"

Deno.test("fetch-with-retry", async (t) => {
  await t.step("fetches a 200 response", async () => {
    const can = new CannedResponses([new Response("👍", { status: 200 })])
    const actual = await fetchWithRetry(new Request("https://example.com"), { _fetch: can.fetch })
    assertEquals(actual.data, "👍")
    assertEquals(actual.response.status, 200)
  })

  await t.step("retries a 500 response", async () => {
    const can = new CannedResponses([
      new Response("💥", { status: 500 }),
      new Response("👍", { status: 200 }),
    ])
    const actual = await fetchWithRetry(new Request("https://example.com"), { _fetch: can.fetch })
    assertEquals(actual.data, "👍")
    assertEquals(actual.response.status, 200)
  })

  await t.step("retries an error", async () => {
    const can = new CannedResponses([
      new Error("Weird network error"),
      new Response("👍", { status: 200 }),
    ])
    const actual = await fetchWithRetry(new Request("https://example.com"), { _fetch: can.fetch })
    assertEquals(actual.response.status, 200)
  })

  await t.step("returns the most recent unwell response after max retries", async () => {
    const can = new CannedResponses([
      new Response("💥", { status: 500 }),
      new Response("💥", { status: 501 }),
      new Response("💥", { status: 502 }),
      new Response("💥", { status: 503 }),
    ])
    const actual = await fetchWithRetry(new Request("https://example.com"), { _fetch: can.fetch, retries: 2 })
    assertEquals(actual.response.status, 502)
  })

  await t.step("throws the most recent error after max retries", async () => {
    const can = new CannedResponses([new Error("1️⃣"), new Error("2️⃣"), new Error("3️⃣"), new Error("4️⃣")])
    await assertRejects(
      () => fetchWithRetry(new Request("https://example.com"), { _fetch: can.fetch, retries: 2 }),
      Error,
      "3️⃣",
    )
  })

  await t.step("when receiving alternating non-OK responses / errors", async (t) => {
    await t.step("throws if last retry was an error", async () => {
      const can = new CannedResponses([
        new Error("1️⃣"),
        // ↑ Given the first request results in this error…
        new Response("2️⃣", { status: 501 }),
        // ↑ then Retrier should retry, resulting in a bad response…
        new Error("3️⃣"),
        // ↑ and then an error again
      ])
      await assertRejects(
        () => fetchWithRetry(new Request("https://example.com"), { _fetch: can.fetch, retries: 2 }),
        Error,
        "3️⃣",
      )
    })

    await t.step("rejects if last retry was a non-OK response", async () => {
      const can = new CannedResponses([
        new Error("1️⃣"),
        new Error("2️⃣"),
        new Response("3️⃣", { status: 418 }),
      ])
      const actual = await fetchWithRetry(new Request("https://example.com"), { _fetch: can.fetch, retries: 2 })
      assertEquals(actual.response.status, 418)
    })
  })

  await t.step("emits lifecycle events", async () => {
    const resp1 = new Response("1️⃣", { status: 500 })
    const resp2 = new Error("💥")
    const resp3 = new Response("3️⃣", { status: 200 })
    const can = new CannedResponses([resp1, resp2, resp3])
    const request = new Request("https://example.com")
    const eventSpy = spy()

    await fetchWithRetry(request, { _fetch: can.fetch, retries: 2, progress: (data) => eventSpy(data) })

    assertProgressCalls(eventSpy, [
      { type: "fetching", retry: 0, retries: 2, request },
      { type: "fetched", retry: 0, retries: 2, response: resp1 },
      { type: "retrying", retry: 0, retries: 2, reason: "status code: 500" },

      { type: "fetching", retry: 1, retries: 2, request },
      { type: "error", retry: 1, retries: 2, error: resp2 },
      { type: "retrying", retry: 1, retries: 2, reason: "error: 💥" },

      { type: "fetching", retry: 2, retries: 2, request },
      { type: "fetched", retry: 2, retries: 2, response: resp3 },
      { type: "done", retry: 2, retries: 2, response: resp3 },
    ])
  })

  await t.step("defaults to using built-in fetch", async () => {
    await withMockedFetch(async (mf) => {
      const can = new CannedResponses([new Response("👍")])
      mf("GET@/foo", can.fetch)

      await fetchWithRetry(new Request("https://example.com/foo"), { _fetch: undefined })

      assertSpyCalls(can.fetchSpy, 1)
      assertEquals(can.fetchSpy.calls[0].args[0].url, "https://example.com/foo")
    })
  })
})

function assertProgressCalls(
  eventSpy: Spy,
  calls: Array<FetchWithRetryProgress>,
) {
  for (const [idx, expected] of calls.entries()) {
    const actual = eventSpy.calls[idx].args[0]
    if (actual.delay) actual.delay = typeof actual.delay
    assertEquals(
      actual,
      expected,
      `Progress mismatch for call ${idx}, got:` +
        ` ${JSON.stringify(actual, null, 2)}`,
    )
  }
  assertEquals(
    eventSpy.calls.length,
    calls.length,
    `Progress mismatch, wanted ${calls.length} calls` +
      ` but got ${eventSpy.calls.length}:` +
      ` \n${eventSpy.calls.map((el) => JSON.stringify(el.args[0])).join("\n")}`,
  )
}
