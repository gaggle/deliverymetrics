import { assertEquals } from "dev:asserts"

import { monthEnd } from "./date-utils.ts"

Deno.test("monthEnd", async (t) => {
  for (
    const [date, expected] of [
      ["1984-06-06T12:34:56.789Z", "1984-06-30T23:59:59.999Z"],
      ["2022-01-01T00:00:00.000Z", "2022-01-31T23:59:59.999Z"],
      ["2022-02-01T00:00:00.000Z", "2022-02-28T23:59:59.999Z"],
    ]
  ) {
    await t.step(`calculates end of month from ${date}`, () => {
      const actual = monthEnd(new Date(date))
      assertEquals(actual, new Date(expected))
    })
  }
})
