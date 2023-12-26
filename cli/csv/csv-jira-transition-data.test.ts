import { assertEquals } from "dev:asserts"

import { ExtractedStateTransition } from "../../libs/metrics/jira-transition-data.ts"

import { arrayToAsyncGenerator, asyncSingle } from "../../utils/mod.ts"

import { jiraTransitionDatasAsCsv } from "./csv-jira-transition-data.ts"

Deno.test("jiraTransitionDatasAsCsv", async (t) => {
  await t.step("converts Jira transition to a csv row", async () => {
    const jiraTransitionIssue: ExtractedStateTransition = {
      created: 0,
      emailAddress: "example@atlassian.com",
      displayName: "Mr. Example",
      type: "status-fieldId",
      from: "11204",
      fromString: "Review",
      to: "27290",
      toString: "Finished",
    }

    const result = await asyncSingle(
      jiraTransitionDatasAsCsv(arrayToAsyncGenerator([jiraTransitionIssue])),
    )

    assertEquals(result, {
      By: "Mr. Example (example@atlassian.com)",
      Created: "1970-01-01T00:00:00.000Z",
      "Duration (in days)": "",
      "Duration (in ms)": "",
      "Duration": "",
      From: "Review",
      To: "Finished",
      Type: "status-fieldId",
    })
  })
})
