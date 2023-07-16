import { assertEquals } from "dev:asserts"
import { z } from "zod"

import { asyncToArray } from "../../utils/mod.ts"

import { CannedResponses } from "../../dev-utils.ts"

import { jiraPaginationFieldsSchema } from "../jira-pagination-fields-schema.ts"

import { fetchJiraApiExhaustively } from "./fetch-jira-api-exhaustively.ts"

Deno.test("fetch-jira-api-exhaustively", async (t) => {
  function getCan() {
    return new CannedResponses([
      new Response(
        JSON.stringify({ "startAt": 0, "maxResults": 2, "total": 6, "issues": [1, 2] }),
        { status: 200, headers: { "content-type": "application/json;charset=UTF-8" } },
      ),
      new Response(
        JSON.stringify({ "startAt": 2, "maxResults": 2, "total": 6, "issues": [3, 4] }),
        { status: 200, headers: { "content-type": "application/json;charset=UTF-8" } },
      ),
      new Response(
        JSON.stringify({ "startAt": 4, "maxResults": 2, "total": 6, "issues": [5, 6] }),
        { status: 200, headers: { "content-type": "application/json;charset=UTF-8" } },
      ),
      new Response(
        JSON.stringify({ "startAt": 6, "maxResults": 2, "total": 6, "issues": [] }),
        { status: 200, headers: { "content-type": "application/json;charset=UTF-8" } },
      ),
    ])
  }

  await t.step("paginates through Jira body data", async () => {
    const can = getCan()
    const actual = await asyncToArray(fetchJiraApiExhaustively(
      (startAt) => new Request(`https://example.com?startAt=${startAt}`),
      jiraPaginationFieldsSchema.extend({ issues: z.array(z.number()) }),
      { _fetch: can.fetch, maxRetries: 0 },
    ))
    assertEquals(can.fetchSpy.calls.map((el) => el.args[0].url), [
      "https://example.com/?startAt=undefined",
      "https://example.com/?startAt=2",
      "https://example.com/?startAt=4",
    ])

    const [r1, r2, r3] = actual
    assertEquals(r1.data.issues, [1, 2])
    assertEquals(r2.data.issues, [3, 4])
    assertEquals(r3.data.issues, [5, 6])
  })
})
