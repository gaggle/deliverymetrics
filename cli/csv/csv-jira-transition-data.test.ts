import { assertEquals } from "dev:asserts"

import { getFakeJiraIssue, getFakeJiraIssueChangelogHistory } from "../../libs/jira/api/search/mod.ts"
import { JiraTransitionData } from "../../libs/metrics/jira-transition-data.ts"

import { arrayToAsyncGenerator, asyncSingle } from "../../utils/mod.ts"

import { jiraTransitionDataAsCsv } from "./csv-jira-transition-data.ts"

Deno.test("jiraTransitionDataAsCsv", async (t) => {
  await t.step("converts Jira transition to a csv row", async () => {
    const jiraTransitionIssue: JiraTransitionData = {
      issue: getFakeJiraIssue({
        changelog: {
          histories: [
            getFakeJiraIssueChangelogHistory({
              created: "1980-01-01T01:00:00.000+0000",
            }),
          ],
        },
      }),
      created: 0,
      emailAddress: "example@atlassian.com",
      displayName: "Mr. Example",
      type: "status-change",
      from: "11204",
      fromString: "Review",
      to: "27290",
      toString: "Finished",
    }

    const result = await asyncSingle(
      jiraTransitionDataAsCsv(arrayToAsyncGenerator([jiraTransitionIssue])),
    )

    assertEquals(result, {
      By: "Mr. Example (example@atlassian.com)",
      Created: "1970-01-01T00:00:00.000Z",
      "Duration (in days)": "",
      From: "Review",
      Key: "PRD-1",
      Summary: "",
      To: "Finished",
      Type: "status-change",
    })
  })
})
