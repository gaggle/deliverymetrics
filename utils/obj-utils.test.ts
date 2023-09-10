import { assertEquals, assertThrows } from "dev:asserts"

import { getValueByPath, setValueByPath } from "./obj-utils.ts"

Deno.test("getValueByPath gets via path", () => {
  const a = {
    foo: {
      bar: "baz",
    },
  }

  assertEquals(getValueByPath(a, "foo.bar"), "baz")
})

Deno.test("getValueByPath returns undefined if leaf is missing", () => {
  const a = {
    foo: {
      bar: "baz",
    },
  }

  assertEquals(getValueByPath(a, "foo.ham"), undefined)
})

Deno.test("getValueByPath throws if path is completely wrong", () => {
  const a = { foo: "bar" }

  assertThrows(
    () => getValueByPath(a, "eggs.bacon"),
    TypeError,
    `Cannot read path 'eggs.bacon' from object`,
  )
})

Deno.test("getValueByPath fails by telling which part of a nested path failed", () => {
  const a = { foo: { bar: "baz", }, }

  assertThrows(
    () => getValueByPath(a, "foo.ham.spam"),
    TypeError,
    `Cannot read path 'foo.ham.spam' from object`,
  )
})

Deno.test("getValueByPath fails by telling which part of a deeply nested path failed", () => {
  const a = { foo: { bar: { baz: { ham: { spam: "eggs" } } }, }, }

  assertThrows(
    () => getValueByPath(a, "foo.bar.baz.donut.glazing"),
    TypeError,
    `Cannot read path 'foo.bar.baz.donut.glazing' from object`,
  )
})

Deno.test("setValueByPath sets value via path", () => {
  const a = {
    foo: {
      bar: "baz",
    },
  }

  setValueByPath(a, "foo.bar", "newValue")
  assertEquals(a.foo.bar, "newValue")
})

Deno.test("setValueByPath creates leaf if missing and sets value", () => {
  const a = {
    foo: {
      bar: "baz",
    },
  }

  setValueByPath(a, "foo.ham", "newLeafValue")
  // deno-lint-ignore no-explicit-any
  assertEquals((a.foo as any).ham, "newLeafValue")
})

Deno.test("setValueByPath creates full path if missing and sets value", () => {
  const a = {
    foo: {
      bar: "baz",
    },
  }

  setValueByPath(a, "eggs.bacon", "fullNewPathValue")
  // deno-lint-ignore no-explicit-any
  assertEquals((a as any).eggs.bacon, "fullNewPathValue")
})
