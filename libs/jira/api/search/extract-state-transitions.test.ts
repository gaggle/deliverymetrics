import { assertEquals } from "dev:asserts"

import { asyncSingle, asyncToArray } from "../../../../utils/mod.ts"

import { extractStateTransitions } from "./extract-state-transitions.ts"
import {
  getFakeJiraIssue,
  getFakeJiraIssueChangelogHistory,
  getFakeJiraIssueChangelogHistoryItem,
} from "./get-fake-jira-issue.ts"

Deno.test("extractStateTransitions", async (t) => {
  await t.step("extracts status transition", async () => {
    const jiraIssue = getFakeJiraIssue({
      changelog: {
        histories: [
          getFakeJiraIssueChangelogHistory({
            id: "33850575",
            created: "1980-01-02T00:00:00.000+0000",
            author: {
              accountId: "123a1aabb123ab0123a1a111",
              emailAddress: "example@atlassian.com",
              displayName: "Mr. Example",
              timeZone: "Europe/London",
            },
            items: [
              getFakeJiraIssueChangelogHistoryItem({
                field: "status",
                fieldId: "status",
                from: "11204",
                fromString: "Review",
                to: "27290",
                toString: "Finished",
              }),
            ],
          }),
        ],
      },
      fields: {
        status: {
          self: "https://atlassian.net/rest/api/2/status/24512",
          name: "Finished",
          id: "27290",
          statusCategory: {
            self: "https://atlassian.net/rest/api/2/statuscategory/3",
            id: 3,
            key: "done",
            colorName: "green",
            name: "Done",
          },
        },
      },
    })

    const result = await asyncSingle(extractStateTransitions(jiraIssue))

    assertEquals(result, {
      type: "status-change",
      created: new Date("1980-01-02T00:00:00.000+0000").getTime(),
      displayName: "Mr. Example",
      emailAddress: "example@atlassian.com",
      from: "11204",
      fromString: "Review",
      to: "27290",
      toString: "Finished",
    })
  })

  await t.step("identifies only state transitions amongst other histories", async () => {
    const jiraIssue = getFakeJiraIssue({
      changelog: {
        histories: [
          getFakeJiraIssueChangelogHistory({
            author: { emailAddress: "foo" },
            id: "33850575",
            created: "2023-11-29T09:27:56.334+0000",
            items: [
              getFakeJiraIssueChangelogHistoryItem({
                field: "status",
                fieldId: "status",
              }),
            ],
          }),
          getFakeJiraIssueChangelogHistory({
            author: { emailAddress: "bar" },
            id: "28234111",
            created: "2023-07-10T00:10:09.462+0100",
            items: [
              getFakeJiraIssueChangelogHistoryItem({
                field: "description",
                fieldId: "description",
                fromString: "h1. Title\n\nThis is a description",
                toString: "h3. Title\n\nThis is a description",
              }),
            ],
          }),
        ],
      },
    })

    const result = await asyncSingle(extractStateTransitions(jiraIssue))
    assertEquals(result.emailAddress, "foo")
  })

  await t.step("extracts resolution transition", async () => {
    const jiraIssue = getFakeJiraIssue({
      changelog: {
        histories: [
          getFakeJiraIssueChangelogHistory({
            id: "33850575",
            created: "1980-01-02T00:00:00.000+0000",
            author: {
              accountId: "123a1aabb123ab0123a1a111",
              emailAddress: "example@atlassian.com",
              displayName: "Mr. Example",
              timeZone: "Europe/London",
            },
            items: [
              getFakeJiraIssueChangelogHistoryItem({
                field: "resolution",
                fieldId: "resolution",
                to: "10000",
                toString: "Done",
              }),
              getFakeJiraIssueChangelogHistoryItem({
                field: "status",
                fieldId: "status",
                from: "11204",
                fromString: "Review",
                to: "27290",
                toString: "Finished",
              }),
            ],
          }),
        ],
      },
      fields: {
        status: {
          self: "https://atlassian.net/rest/api/2/status/24512",
          name: "Finished",
          id: "27290",
          statusCategory: {
            self: "https://atlassian.net/rest/api/2/statuscategory/3",
            id: 3,
            key: "done",
            colorName: "green",
            name: "Done",
          },
        },
      },
    })

    const result = await asyncToArray(extractStateTransitions(jiraIssue))

    assertEquals(result, [
      {
        type: "resolved",
        created: new Date("1980-01-02T00:00:00.000+0000").getTime(),
        displayName: "Mr. Example",
        emailAddress: "example@atlassian.com",
        from: null,
        fromString: null,
        to: "10000",
        toString: "Done",
      },
      {
        type: "status-change",
        created: new Date("1980-01-02T00:00:00.000+0000").getTime(),
        displayName: "Mr. Example",
        emailAddress: "example@atlassian.com",
        from: "11204",
        fromString: "Review",
        to: "27290",
        toString: "Finished",
      },
    ])
  })
})
