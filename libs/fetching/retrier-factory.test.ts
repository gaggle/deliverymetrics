import { assertInstanceOf } from "dev:asserts"

import { withMockedFetch } from "../dev-utils.ts"

import { Retrier } from "./retrier.ts"
import { retrierFactory } from "./retrier-factory.ts"

Deno.test("retrierFactory", async (t) => {
  await t.step("can be invoked without arguments ", () => {
    const retrier = retrierFactory()
    assertInstanceOf(retrier, Retrier)
  })

  await t.step("has expected events", () => {
    const retrier = retrierFactory({ strategy: "rate-limit-exponential" })
    retrier.on("rate-limited", () => {
      // this would be a compile error if retrier didn't have the right event-names
    })
  })

  await t.step("can create a simple Retrier", async () => {
    await withMockedFetch(async (mockFetch) => {
      mockFetch("GET@/foo", () => new Response("💥", { status: 500 }))

      const retrier = retrierFactory({ strategy: "simple" })
      const result = await retrier.fetch("https://x/foo")

      assertInstanceOf(result, Response)
    })
  })
})
