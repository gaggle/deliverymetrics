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

  await t.step("doesn't exclude a header if its also part of headerOrder", () => {
    assertEquals(
      reorganizeHeaders(["f1", "f2", "x1", "x2"], { ignoreHeaders: ["f1", /x./], includeHeaders: ["f1", "x1"] }),
      ["f1", "f2", "x1"],
    )
  })

  await t.step("sorts a complex set of string & regex sorting specifications", () => {
    const headers = [
      "Lead Time (in days)",
      "Time to Merge (in days)",
      "Was Cancelled?",
      "closed_at",
      "created_at",
      "merged_at",
      "number",
      "title",
      "updated_at",
    ]

    const headerOrder = [
      /.*_at$/,
      "Was Cancelled?",
      "Lead Time (in days)",
      "Time to Merge (in days)",
      "number",
      "title",
    ]
    assertEquals(
      reorganizeHeaders(headers, { headerOrder }),
      [
        "closed_at",
        "created_at",
        "merged_at",
        "updated_at",
        "Was Cancelled?",
        "Lead Time (in days)",
        "Time to Merge (in days)",
        "number",
        "title",
      ],
    )
  })
})
