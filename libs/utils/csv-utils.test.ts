import { assertEquals } from "dev:asserts"

import { reorganizeHeaders } from "./mod.ts"

Deno.test("reorganizeHeaders", async (t) => {
  await t.step("subtracts ignored headers", () => {
    assertEquals(reorganizeHeaders(["foo", "bar"], { ignoreHeaders: ["bar"] }), ["foo"])
  })

  await t.step("subtracts ignored headers that matches on regex", () => {
    assertEquals(reorganizeHeaders(["foo", "bar"], { ignoreHeaders: [/bar/] }), ["foo"])
    assertEquals(reorganizeHeaders(["foo", "bar", "baz"], { ignoreHeaders: [/^ba.*/] }), ["foo"])
  })

  await t.step("handles simple ordering", () => {
    assertEquals(reorganizeHeaders(["foo", "bar"], { headerOrder: ["bar"] }), ["bar", "foo"])
  })

  await t.step("handles complex ordering", () => {
    assertEquals(
      reorganizeHeaders(["foo", "bar", "baz", "ham", "spam", "eggs"], { headerOrder: ["spam", "bar"] }),
      ["spam", "bar", "foo", "baz", "ham", "eggs"],
    )

    assertEquals(
      reorganizeHeaders(["foo", "bar", "baz", "ham", "spam", "eggs"], { headerOrder: ["bar", "spam"] }),
      ["bar", "spam", "foo", "baz", "ham", "eggs"],
    )
  })

  await t.step("handles ordering for simple regex", () => {
    assertEquals(
      reorganizeHeaders(["foo", "spam", "eggs"], { headerOrder: [/\w{4}/] }),
      ["spam", "eggs", "foo"],
    )
  })

  await t.step("handles orders for complex regexes", () => {
    assertEquals(
      reorganizeHeaders(["f1", "f3", "x3", "x2", "f2", "x1"], { headerOrder: [/^f+/] }),
      ["f1", "f3", "f2", "x3", "x2", "x1"],
    )
  })
})
