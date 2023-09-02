import { assertEquals } from "dev:asserts"

import { monthEnd, toMins } from "./date-utils.ts"

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

Deno.test("toMins", async (t) => {
  for (
    const [input, expected] of [
      [60_000, 1],
      [90_000, 1.5],
      [30_000, 0.5],
    ]
  ) {
    await t.step(`turns ${input} to ${expected} minutes`, () => {
      assertEquals(toMins(input), expected)
    })
  }
})
