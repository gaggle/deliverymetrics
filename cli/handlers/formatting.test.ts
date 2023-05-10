import { StringWriter } from "std:io"
import { assertEquals } from "dev:asserts"

import { dot, write } from "./formatting.ts"

Deno.test("write", async (t) => {
  await t.step("always ends on a newline", () => {
    const writer = new StringWriter()

    write("foo", { _stdOutLike: writer })
    assertEquals(writer.toString(), "foo\n")
  })
})

Deno.test("dot", async (t) => {
  await t.step("writes a dot by default", () => {
    const writer = new StringWriter()

    dot({ _stdOutLike: writer })
    assertEquals(writer.toString(), ".")
  })

  await t.step("can write any char", () => {
    const writer = new StringWriter()

    dot({ char: "-", _stdOutLike: writer })
    assertEquals(writer.toString(), "-")
  })
})
