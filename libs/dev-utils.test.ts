import { assertEquals, AssertionError, assertRejects } from "dev:asserts"
import { stub } from "dev:mock"

import { waitFor, withStubs } from "./dev-utils.ts"

Deno.test("withStubs", async (t) => {
  const foo = { bar: () => "baz" }

  await t.step("passes the provided stubs into the callable", () => {
    withStubs((stub) => {
      assertEquals(stub(), "ham")
    }, stub(foo, "bar", () => "ham"))
  })
})

Deno.test("waitFor", async (t) => {
  await t.step("waits for timeout to run", async () => {
    let passed = false

    setTimeout(() => passed = true, 1)
    await waitFor(() => passed === true, 100)

    assertEquals(passed, true)
  })

  await t.step("fails with AssertionError if wait timeout is exceeded", async () => {
    await assertRejects(() => waitFor(() => false, 1), AssertionError)
  })
})
