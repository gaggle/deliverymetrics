import { assertEquals } from "dev:asserts"

import { toCurlCommand } from "./to-curl-command.ts"

Deno.test("toCurlCommand", async (t) => {
  await t.step("requires url", () => {
    const result = toCurlCommand(new Request("https://example.com"))
    assertEquals(result, "curl -X GET 'https://example.com/'")
  })

  await t.step("takes a request with method, headers, and body", () => {
    const result = toCurlCommand(
      new Request("https://example.com", {
        body: "body",
        headers: new Headers({ header: "example" }),
        method: "post",
      }),
      "body",
    )
    assertEquals(
      result,
      "curl -X POST 'https://example.com/' -H 'content-type: text/plain;charset=UTF-8' -H 'header: example' -d 'body'",
    )
  })
})
