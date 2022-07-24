import { asserts } from "../dev-deps.ts";

import { calculateBackoff } from "./backoff.ts";

Deno.test("calculateBackoff calculates exponential delays", () => {
  const delays = Array.from(Array(5).keys()).map((el) => calculateBackoff(el));
  asserts.assertEquals(delays, [1000, 2000, 4000, 8000, 16000]);
});
