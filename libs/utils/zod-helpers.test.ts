import { assertThrows } from "dev:asserts"
import { z } from "zod"

import { EnrichedZodError, parseWithZodSchema } from "./zod-helpers/mod.ts"

Deno.test("parseWithZodSchema", async (t) => {
  await t.step("handles failing with a Zod schema error", () => {
    assertThrows(
      () => parseWithZodSchema({ foo: null }, z.object({ foo: z.string() })),
      EnrichedZodError,
      'Validation error: Expected string, received null at "foo"',
    )
  })
})
