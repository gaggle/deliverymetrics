import { z } from "zod"
import { assertThrows } from "dev:asserts"

import { parseWithZodSchemaFromRequest } from "./parse.ts"
import { EnrichedZodError } from "./errors.ts"

Deno.test("parseWithZodSchemaFromRequest", async (t) => {
  await t.step("contains curl command", async () => {
    const request = new Request("https://example.com", { body: '["foo"]', method: "POST" })
    const requestBody = await request.text()
    assertThrows(
      () =>
        parseWithZodSchemaFromRequest({
          data: "foo",
          schema: z.literal("bar"),
          response: new Response("https://example.com", { status: 200 }),
          request,
          requestBody,
        }),
      EnrichedZodError,
      `curl -X POST 'https://example.com/' -H 'content-type: text/plain;charset=UTF-8' -d '["foo"]'`,
    )
  })
})
