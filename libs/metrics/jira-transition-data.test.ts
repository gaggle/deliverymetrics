import { assertEquals } from "dev:asserts"

import { arrayToAsyncGenerator, asyncSingle, asyncToArray, fromHours, pick } from "../../utils/mod.ts"

import {
  getFakeJiraIssue,
  getFakeJiraIssueChangelogHistory,
  getFakeJiraIssueChangelogHistoryItem,
} from "../jira/api/search/get-fake-jira-issue.ts"

import { extractStateTransitions, yieldJiraTransitionData } from "./jira-transition-data.ts"

Deno.test("yieldJiraTransitionData", async (t) => {
  await t.step("yields correct JiraTransitionData for each issue", async () => {
    const fakeJiraIssue = getFakeJiraIssue({
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
    })
    const fakeYieldJiraSearchIssues = arrayToAsyncGenerator([fakeJiraIssue])

    const { issue, ...rest } = await asyncSingle(yieldJiraTransitionData(fakeYieldJiraSearchIssues))

    assertEquals(issue, fakeJiraIssue)
    assertEquals(rest, {
      created: 315619200000,
      displayName: "Mr. Example",
      emailAddress: "example@atlassian.com",
      from: "11204",
      fromString: "Review",
      to: "27290",
      toString: "Finished",
      type: "status-change",
    })
  })
})

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

  await t.step("yields transitions from oldest to newest", async () => {
    const jiraIssue = getFakeJiraIssue({
      changelog: {
        histories: [
          getFakeJiraIssueChangelogHistory({
            created: "1980-01-20T06:00:00.000+0000",
            author: {
              emailAddress: "example@atlassian.com",
              displayName: "Mr. Example",
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
          getFakeJiraIssueChangelogHistory({
            created: "1980-01-10T08:00:00.000+0000",
            author: {
              emailAddress: "example@atlassian.com",
              displayName: "Mr. Example",
            },
            items: [
              getFakeJiraIssueChangelogHistoryItem({
                field: "status",
                fieldId: "status",
                from: "3",
                fromString: "In Progress",
                to: "11204",
                toString: "Review",
              }),
            ],
          }),
          getFakeJiraIssueChangelogHistory({
            created: "1980-01-02T10:00:00.000+0000",
            author: {
              emailAddress: "example@atlassian.com",
              displayName: "Mr. Example",
            },
            items: [
              getFakeJiraIssueChangelogHistoryItem({
                field: "status",
                fieldId: "status",
                from: "10600",
                fromString: "Backlog",
                to: "3",
                toString: "In Progress",
              }),
            ],
          }),
        ],
      },
    })

    const result = await asyncToArray(extractStateTransitions(jiraIssue))

    assertEquals(result.map((el) => pick(el, "created")), [
      { created: new Date("1980-01-02T10:00:00.000+0000").getTime() },
      { created: new Date("1980-01-10T08:00:00.000+0000").getTime() },
      { created: new Date("1980-01-20T06:00:00.000+0000").getTime() },
    ])
  })

  await t.step("calculates duration between transitions", async () => {
    const jiraIssue = getFakeJiraIssue({
      changelog: {
        histories: [
          getFakeJiraIssueChangelogHistory({
            created: "1980-01-20T06:00:00.000+0000",
            author: {
              emailAddress: "example@atlassian.com",
              displayName: "Mr. Example",
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
          getFakeJiraIssueChangelogHistory({
            created: "1980-01-10T08:00:00.000+0000",
            author: {
              emailAddress: "example@atlassian.com",
              displayName: "Mr. Example",
            },
            items: [
              getFakeJiraIssueChangelogHistoryItem({
                field: "status",
                fieldId: "status",
                from: "3",
                fromString: "In Progress",
                to: "11204",
                toString: "Review",
              }),
            ],
          }),
          getFakeJiraIssueChangelogHistory({
            created: "1980-01-02T10:00:00.000+0000",
            author: {
              emailAddress: "example@atlassian.com",
              displayName: "Mr. Example",
            },
            items: [
              getFakeJiraIssueChangelogHistoryItem({
                field: "status",
                fieldId: "status",
                from: "10600",
                fromString: "Backlog",
                to: "3",
                toString: "In Progress",
              }),
            ],
          }),
        ],
      },
    })

    const result = await asyncToArray(extractStateTransitions(jiraIssue))

    assertEquals(result.map((el) => pick(el, "created", "duration", "toString")), [
      {
        created: new Date("1980-01-02T10:00:00.000+0000").getTime(),
        toString: "In Progress",
      },
      {
        created: new Date("1980-01-10T08:00:00.000+0000").getTime(),
        duration: fromHours(190),
        toString: "Review",
      },
      {
        created: new Date("1980-01-20T06:00:00.000+0000").getTime(),
        duration: fromHours(238),
        toString: "Finished",
      },
    ])
  })

  await t.step("identifies state transitions amongst other histories", async () => {
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

  await t.step("identifies transitions of Key", async () => {
    const jiraIssue = getFakeJiraIssue({
      changelog: {
        histories: [
          getFakeJiraIssueChangelogHistory({
            items: [
              getFakeJiraIssueChangelogHistoryItem({
                "field": "Key",
                "fieldtype": "jira",
                "from": null,
                "fromString": "NRG-119",
                "to": null,
                "toString": "NRGT-400",
              }),
            ],
          }),
        ],
      },
    })

    await asyncSingle(extractStateTransitions(jiraIssue))
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

    assertEquals(result.map((el) => el.type), ["resolved", "status-change"])
  })

  await t.step("ignores no-op transitions (e.g. from and to the same status)", async () => {
    const jiraIssue = getFakeJiraIssue({
      changelog: {
        histories: [
          getFakeJiraIssueChangelogHistory({
            created: "1980-01-01T00:00:00.000+0000",
            items: [
              getFakeJiraIssueChangelogHistoryItem({
                field: "status",
                fieldId: "status",
                from: "11202",
                fromString: "Backlog",
                to: "25814",
                toString: "Refining",
              }),
            ],
          }),
          getFakeJiraIssueChangelogHistory({
            created: "2000-01-01T00:00:00.000+0000",
            items: [
              getFakeJiraIssueChangelogHistoryItem({
                field: "status",
                fieldId: "status",
                from: "25814",
                fromString: "Refining",
                to: "25814",
                toString: "Refining",
              }),
            ],
          }),
        ],
      },
    })

    const result = await asyncSingle(extractStateTransitions(jiraIssue))

    assertEquals(result.created, new Date("1980-01-01T00:00:00.000+0000").getTime())
  })
})
