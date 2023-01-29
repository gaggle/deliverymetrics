import { assertEquals } from "dev:asserts"

import { calculateBackoff } from "./backoff.ts"

Deno.test("calculateBackoff calculates exponential delays", () => {
  const delays = Array.from(Array(5).keys()).map((el) => calculateBackoff(el))
  assertEquals(delays, [1000, 2000, 4000, 8000, 16000])
})
