import { assertEquals, assertObjectMatch, assertRejects } from "dev:asserts"
import { assertSpyCall, Spy, spy } from "dev:mock"

import { waitFor } from "../dev-utils.ts"

import { Retrier } from "./retrier.ts"
import { simpleBackoff } from "./retrier-backoff-functions.ts"

Deno.test("Retrier", async (t) => {
  await t.step("asks backoffFn about ok responses", async () => {
    const cannedResponses: Array<() => Promise<Response>> = [
      () => Promise.resolve(new Response("👍", { status: 200 })),
    ]
    const retrier = new Retrier(simpleBackoff, { _fetch: () => cannedResponses.shift()!() })
    const resp = await retrier.fetch("https://x/foo")
    assertEquals(resp.status, 200)
  })

  await t.step("asks backoffFn about non-ok response", async () => {
    const cannedResponses: Array<() => Promise<Response>> = [
      () => Promise.resolve(new Response("💥", { status: 500 })),
      () => Promise.resolve(new Response("👍", { status: 200 })),
    ]
    const retrier = new Retrier(simpleBackoff, { _fetch: () => cannedResponses.shift()!() })
    const resp = await retrier.fetch("https://x/foo")
    assertEquals(resp.status, 200)
  })

  await t.step("retries an error", async () => {
    const cannedResponses: Array<() => Promise<Response>> = [
      () => Promise.reject(new Error("Weird network error") as unknown as Response),
      () => Promise.resolve(new Response("👍", { status: 200 })),
    ]
    const retrier = new Retrier(simpleBackoff, { _fetch: () => cannedResponses.shift()!() })
    const resp = await retrier.fetch("https://x/foo")
    assertEquals(resp.status, 200)
  })

  await t.step("returns the most recent unwell response after max retries", async () => {
    const cannedResponses: Array<() => Promise<Response>> = [
      () => Promise.resolve(new Response("💥", { status: 500 })),
      () => Promise.resolve(new Response("💥", { status: 501 })),
      () => Promise.resolve(new Response("💥", { status: 502 })),
      () => Promise.resolve(new Response("💥", { status: 503 })),
    ]
    const retrier = new Retrier(simpleBackoff, {
      _fetch: () => cannedResponses.shift()!(),
      retries: 3,
    })
    const resp = await retrier.fetch("https://x/foo")
    assertEquals(resp.status, 503)
  })

  await t.step("throws the most recent error after max retries", async () => {
    const cannedResponses: Array<() => Promise<Response>> = [
      () => Promise.reject(new Error("1️⃣") as unknown as Response),
      () => Promise.reject(new Error("2️⃣") as unknown as Response),
      () => Promise.reject(new Error("3️⃣") as unknown as Response),
    ]
    const retrier = new Retrier(simpleBackoff, {
      _fetch: () => cannedResponses.shift()!(),
      retries: 2,
    })
    await assertRejects(
      () => retrier.fetch("https://x/foo"),
      Error,
      "3️⃣",
    )
    // ↑ A max retries of 2 means Retrier should retry twice, meaning we get the 3rd attempt
  })

  await t.step("when receiving alternating non-OK responses / errors", async (t) => {
    await t.step("throws if last retry was an error", async () => {
      const cannedResponses: Array<() => Promise<Response>> = [
        () => Promise.reject(new Error("1️⃣") as unknown as Response),
        // ↑ Given the first request results in this error…
        () => Promise.resolve(new Response("2️⃣", { status: 501 })),
        // ↑ then Retrier should retry, resulting in a bad response…
        () => Promise.reject(new Error("3️⃣") as unknown as Response),
        // ↑ and then an error again
      ]
      const retrier = new Retrier(simpleBackoff, {
        _fetch: () => Promise.resolve(cannedResponses.shift()!()),
        retries: 2,
      })
      await assertRejects(
        () => retrier.fetch("https://x/foo"),
        Error,
        "3️⃣",
      )
    })

    await t.step("rejects if last retry was a non-OK response", async () => {
      const cannedResponses: Array<() => Promise<Response>> = [
        () => Promise.reject(new Error("1️⃣") as unknown as Response),
        () => Promise.reject(new Error("2️⃣") as unknown as Response),
        () => Promise.resolve(new Response("3️⃣", { status: 418 })),
      ]
      const retrier = new Retrier(simpleBackoff, {
        _fetch: () => Promise.resolve(cannedResponses.shift()!()),
        retries: 2,
      })
      const resp = await retrier.fetch("https://x/foo")
      assertEquals(resp.status, 418)
    })
  })

  await t.step("calls passed-in backoff-function correctly", async () => {
    const backoffFn = spy(() => 0)
    const response = new Response("🤷‍️", { status: 500 })
    const retrier = new Retrier(backoffFn, {
      _fetch: () => Promise.resolve(response),
      retries: 3,
    })

    await retrier.fetch("https://x/foo")

    assertObjectMatch(getSpyArgs(backoffFn, 0)[0], { attemptNumber: 0, response })
    assertObjectMatch(getSpyArgs(backoffFn, 1)[0], { attemptNumber: 1, response })
    assertObjectMatch(getSpyArgs(backoffFn, 2)[0], { attemptNumber: 2, response })
  })

  await t.step("emits lifecycle events", async () => {
    const response1 = new Response("1️⃣", { status: 500 })
    const response2 = new Error("💥")
    const response3 = new Response("3️⃣", { status: 200 })
    const cannedResponses: Array<() => Promise<Response>> = [
      () => Promise.resolve(response1),
      () => Promise.reject(response2),
      () => Promise.resolve(response3),
    ]
    const retrier = new Retrier(simpleBackoff, {
      _fetch: () => cannedResponses.shift()!(),
      retries: 2,
    })

    const eventSpy = spy()
    retrier.on("fetching", (e) => eventSpy("fetching", e))
    retrier.on("fetched", (e) => eventSpy("fetched", e))
    retrier.on("retrying", (e) => eventSpy("retrying", e))
    retrier.on("done", (e) => eventSpy("done", e))

    await retrier.fetch("https://x/foo")

    const expectedEvents = 9
    await waitFor(
      () => eventSpy.calls.length === expectedEvents,
      1000,
      `Supposed to be ${expectedEvents} lifecycle events but only got ${eventSpy.calls.length}:\n${
        JSON.stringify(eventSpy.calls, null, 2)
      }`,
    )
    assertSpyCall(eventSpy, 0, { args: ["fetching", { retries: 2, retry: 0, request: ["https://x/foo"] }] })
    assertSpyCall(eventSpy, 1, { args: ["fetched", { retries: 2, retry: 0, response: response1 }] })
    assertSpyCall(eventSpy, 2, { args: ["retrying", { retries: 2, retry: 0, in: 0 }] })

    assertSpyCall(eventSpy, 3, { args: ["fetching", { retries: 2, retry: 1, request: ["https://x/foo"] }] })
    assertSpyCall(eventSpy, 4, { args: ["fetched", { retries: 2, retry: 1, error: response2 }] })
    assertSpyCall(eventSpy, 5, { args: ["retrying", { retries: 2, retry: 1, in: 0 }] })

    assertSpyCall(eventSpy, 6, { args: ["fetching", { retries: 2, retry: 2, request: ["https://x/foo"] }] })
    assertSpyCall(eventSpy, 7, { args: ["fetched", { retries: 2, retry: 2, response: response3 }] })
    assertSpyCall(eventSpy, 8, { args: ["done", { retries: 2, retry: 2, response: response3 }] })
  })
})

// deno-lint-ignore no-explicit-any
function getSpyArgs(spy: Spy, callIndex: number): any[] {
  return Array.from(spy.calls[callIndex].args)
}
