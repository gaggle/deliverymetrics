import { assertEquals } from "dev:asserts"

import { calculateExponentialBackoff } from "./backoff.ts"

Deno.test("calculateExponentialBackoff", async (t) => {
  await t.step("calculates exponential delays", () => {
    const delays = Array.from(Array(5).keys()).map((attempt) => calculateExponentialBackoff(attempt))
    assertEquals(delays, [1000, 2000, 4000, 8000, 16000])
  })

  await t.step("can change its exponential slope by controlling factor and initial delay", () => {
    const delays = Array.from(Array(6).keys()).map((attempt) =>
      calculateExponentialBackoff(attempt, { factor: 4, minTimeout: 50 })
    )
    assertEquals(delays, [50, 200, 800, 3200, 12800, 51200])
  })

  await t.step("can clamp its max timeout", () => {
    const delays = Array.from(Array(5).keys()).map((attempt) =>
      calculateExponentialBackoff(attempt, { maxTimeout: 3000 })
    )
    assertEquals(delays, [1000, 2000, 3000, 3000, 3000])
  })
})
