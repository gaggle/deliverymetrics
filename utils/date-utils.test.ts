import { assertEquals } from "dev:asserts"

import { formatDuration, monthEnd, toDaysRounded, toMins } from "./date-utils.ts"

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

Deno.test("toDaysRounded", async (t) => {
  const min = 1_000 * 60
  const hour = min * 60
  const day = hour * 24
  for (
    const [input, expected] of [
      [30 * min, 0],
      [hour + 12 * min, 0],
      //
      [hour + 13 * min, 1],
      [day + hour + 11 * min, 1],
      //
      [day + hour + 12 * min, 2],
      [2 * day + hour + 11 * min, 2],
      //
      [2 * day + hour + 12 * min, 3],
      [3 * day + hour + 11 * min, 3],
      //
      [3 * day + hour + 12 * min, 4],
      [4 * day + hour + 11 * min, 4],
      //
      [4 * day + hour + 12 * min, 5],
    ]
  ) {
    await t.step(`turns ${input} to ${expected} minutes`, () => {
      assertEquals(toDaysRounded(input), expected)
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

Deno.test("formatDuration", async (t) => {
  for (
    const [input, expected] of [
      [30_000, "30s"],
      [60_000, "1m"],
      [90_000, "1m30s"],
      [3_600_000, "1h"],
      [86_400_000, "1d"],
      [86_400_000 + 60_000, "1d1m"],
      [86_400_000 + 60_000 + 1_000, "1d1m1s"],
    ] as [number, string][]
  ) {
    await t.step(`format ${input}ms to '${expected}' with seconds`, () => {
      assertEquals(formatDuration(input, { includeSeconds: true }), expected)
    })
  }

  for (
    const [input, expected] of [
      [30_000, "0m"],
      [60_000, "1m"],
      [90_000, "1m"],
      [3_600_000, "1h"],
      [86_400_000, "1d"],
      [86_400_000 + 60_000, "1d1m"],
      [86_400_000 + 60_000 + 1_000, "1d1m"],
      [86_400_000 * 2, "2d"],
    ] as [number, string][]
  ) {
    await t.step(`format ${input}ms to '${expected}'`, () => {
      assertEquals(formatDuration(input), expected)
    })
  }
})
