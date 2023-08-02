import { assertEquals, AssertionError, assertRejects, assertThrows } from "dev:asserts"
import { assertSpyCallArgs, assertSpyCalls, spy, stub } from "dev:mock"

import { CannedResponses, extractCallArgsFromStub, waitFor, withStubs } from "./dev-utils.ts"

Deno.test("CannedResponses", async (t) => {
  await t.step("given a list of responses", async (t) => {
    await t.step("returns canned responses", async () => {
      const resp1 = new Response("👍")
      const resp2 = new Response("👍👍")
      const can = new CannedResponses([resp1, resp2])
      assertEquals(await can.fetch("https://example.com"), resp1)
      assertEquals(await can.fetch("https://example.com"), resp2)
    })

    await t.step("throws error when responses run out", async () => {
      const can = new CannedResponses([])
      await assertRejects(() => can.fetch("https://example.com"), Error, "No more canned responses")
    })

    await t.step("doesn't mutate input array", async () => {
      const responses = [new Response("👍")]
      const can = new CannedResponses(responses)
      await can.fetch("https://example.com")
      assertEquals(responses.length, 1)
    })

    await t.step("also accepts errors", async () => {
      const can = new CannedResponses([new Error("no")])
      await assertRejects(() => can.fetch("https://example.com"), Error, "no")
    })

    await t.step("maintains its spy", async () => {
      const can = new CannedResponses([new Response("👍")])
      await can.fetch("https://example.com")

      assertSpyCalls(can.fetchSpy, 1)
      assertSpyCallArgs(can.fetchSpy, 0, ["https://example.com"])
    })
  })

  await t.step("given a callback", async (t) => {
    await t.step("returns the callback", async () => {
      const resp = new Response("👍")
      const can = new CannedResponses(() => Promise.resolve(resp))
      const result = [
        await can.fetch("https://example.com"),
        await can.fetch("https://example.com"),
      ]
      assertEquals(result, [resp, resp])
    })

    await t.step("maintains its spy", async () => {
      const can = new CannedResponses(() => Promise.resolve(new Response("👍")))

      await can.fetch("https://example.com")
      await can.fetch("https://example.com")

      assertSpyCalls(can.fetchSpy, 2)
      assertSpyCallArgs(can.fetchSpy, 0, ["https://example.com"])
      assertSpyCallArgs(can.fetchSpy, 1, ["https://example.com"])
    })
  })
})

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

Deno.test("extractCallArgsFromStub", async (t) => {
  await t.step("extracts calls", () => {
    const s = spy()
    s("foo")
    s("bar")

    assertEquals(extractCallArgsFromStub(s, 0), ["foo"])
    assertEquals(extractCallArgsFromStub(s, 1), ["bar"])
  })

  await t.step("fails if stub isn't called", () => {
    const s = spy()
    assertThrows(
      () => extractCallArgsFromStub(s, 0),
      AssertionError,
      "stub was called 0 times so cannot access index 0",
    )
  })

  await t.step("fails if asked for calls that aren't made", () => {
    const s = spy()
    s("foo")
    assertThrows(
      () => extractCallArgsFromStub(s, 1),
      AssertionError,
      "stub was called 1 times so cannot access index 1",
    )
  })

  await t.step("fails if expected calls aren't made", () => {
    const s = spy()
    s("foo")
    assertThrows(
      () => extractCallArgsFromStub(s, 0, { expectedCalls: 2 }),
      AssertionError,
      "stub was called 1 times but was expected to be called 2 times",
    )
  })

  await t.step("fails if expected args aren't made", () => {
    const s = spy()
    s("foo")
    assertThrows(
      () => extractCallArgsFromStub(s, 0, { expectedArgs: 2 }),
      AssertionError,
      "stub called with 1 args but was expected to be called with 2 args",
    )
  })
})
