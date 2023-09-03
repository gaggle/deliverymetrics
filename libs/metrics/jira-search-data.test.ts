import { assertArrayIncludes, assertEquals } from "dev:asserts"

import { asyncSingle, asyncToArray } from "../../utils/mod.ts"

import { getFakeDbJiraSearchIssue, getFakeDbJiraSearchNames } from "../jira/api/search/mod.ts"
import { createFakeReadonlyJiraClient, getFakeJiraSyncInfo } from "../jira/mod.ts"

import { getJiraSearchDataYielder } from "./jira-search-data.ts"

Deno.test("fieldKeys returns all field keys translated via search names", async () => {
  const dbIssue = getFakeDbJiraSearchIssue({
    issue: { fields: { updated: "1970-01-10T00:00:00.000+0000" } },
    namesHash: "123",
  })
  const dbNames = getFakeDbJiraSearchNames({
    names: { "customfield_19175": "Foo Bar", "updated": "Updated" },
    hash: dbIssue.namesHash,
  })
  const client = await createFakeReadonlyJiraClient({
    syncs: [getFakeJiraSyncInfo({ type: "search" })],
    searchIssues: [dbIssue],
    searchNames: [dbNames],
  })

  const { fieldKeys } = await getJiraSearchDataYielder(client)

  assertEquals(fieldKeys, [
    "aggregatetimeoriginalestimate",
    "subtasks",
    "timeestimate",
    "aggregatetimespent",
    "labels",
    "reporter",
    "statuscategorychangedate",
    "priority",
    "created",
    "assignee",
    "status",
    "timespent",
    "components",
    "progress",
    "project",
    "issuetype",
    "environment",
    "workratio",
    "timeoriginalestimate",
    "Foo Bar",
    "parent",
    "votes",
    "duedate",
    "aggregateprogress",
    "security",
    "lastViewed",
    "issuelinks",
    "Updated",
    "summary",
    "versions",
    "resolution",
    "watches",
    "description",
    "fixVersions",
    "aggregatetimeestimate",
    "creator",
    "resolutiondate",
  ])
})

Deno.test("fieldKeysToNames", async (t) => {
  await t.step("returns all names", async () => {
    const dbIssue = getFakeDbJiraSearchIssue({
      issue: { fields: { updated: "1970-01-10T00:00:00.000+0000" } },
      namesHash: "123",
    })
    const dbNames = getFakeDbJiraSearchNames({
      names: { "customfield_19175": "Foo Bar", "updated": "Updated" },
      hash: dbIssue.namesHash,
    })
    const client = await createFakeReadonlyJiraClient({
      syncs: [getFakeJiraSyncInfo({ type: "search" })],
      searchIssues: [dbIssue],
      searchNames: [dbNames],
    })

    const { fieldKeysToNames } = await getJiraSearchDataYielder(client)

    assertEquals(fieldKeysToNames, { customfield_19175: "Foo Bar", updated: "Updated" })
  })

  await t.step("uses latest name for each field", async () => {
    const client = await createFakeReadonlyJiraClient({
      syncs: [getFakeJiraSyncInfo({ type: "search" })],
      searchIssues: [
        getFakeDbJiraSearchIssue({ namesHash: "123" }),
        getFakeDbJiraSearchIssue({ namesHash: "987" }),
      ],
      searchNames: [
        getFakeDbJiraSearchNames({
          names: { "customfield_19175": "Foo Bar", "updated": "Updated" },
          hash: "123",
        }),
        getFakeDbJiraSearchNames({
          names: { "customfield_90210": "Foo Bar", "updated": "Updated New" },
          hash: "987",
        }),
      ],
    })

    const { fieldKeysToNames } = await getJiraSearchDataYielder(client)

    assertEquals(fieldKeysToNames, {
      customfield_19175: "Foo Bar",
      customfield_90210: "Foo Bar",
      updated: "Updated New",
    })
  })
})

Deno.test("yieldJiraSearchIssues", async (t) => {
  await t.step("returns an async generator of issues", async () => {
    const dbIssue = getFakeDbJiraSearchIssue({
      issue: { fields: { updated: "1970-01-10T00:00:00.000+0000" } },
      namesHash: "123",
    })
    const dbNames = getFakeDbJiraSearchNames({
      names: { "customfield_19175": "Foo Bar", "updated": "Updated" },
      hash: dbIssue.namesHash,
    })
    const client = await createFakeReadonlyJiraClient({
      syncs: [getFakeJiraSyncInfo({ type: "search" })],
      searchIssues: [dbIssue],
      searchNames: [dbNames],
    })

    const { yieldJiraSearchIssues } = await getJiraSearchDataYielder(client)

    assertEquals((await asyncToArray(yieldJiraSearchIssues)).map((el) => el.id), [dbIssue.issue.id])
  })

  await t.step("stops yielding issues after maxDays old", async () => {
    const client = await createFakeReadonlyJiraClient({
      syncs: [
        getFakeJiraSyncInfo({
          type: "search",
          createdAt: new Date("1970-01-20T00:00:00.000+0000").getTime(),
          updatedAt: new Date("1970-01-20T00:00:00.000+0000").getTime(),
        }),
      ],
      searchIssues: [
        getFakeDbJiraSearchIssue({
          issue: { fields: { updated: "1970-01-10T00:00:00.000+0000" } },
          namesHash: "123",
        }),
        getFakeDbJiraSearchIssue({
          issue: { fields: { updated: "1970-01-09T23:59:59.999+0000" } },
          namesHash: "123",
        }),
      ],
      searchNames: [getFakeDbJiraSearchNames({
        names: { "customfield_19175": "Foo Bar", "updated": "Updated" },
        hash: "123",
      })],
    })

    const { yieldJiraSearchIssues } = await getJiraSearchDataYielder(client, { maxDays: 10 })

    assertEquals((await asyncToArray(yieldJiraSearchIssues)).length, 1)
  })

  await t.step("can include only specified statuses", async () => {
    const doneDbIssue = getFakeDbJiraSearchIssue({
      issue: { key: "2", fields: { status: { name: "Done" } } },
      namesHash: "123",
    })
    const client = await createFakeReadonlyJiraClient({
      syncs: [getFakeJiraSyncInfo({ type: "search" })],
      searchIssues: [
        getFakeDbJiraSearchIssue({ issue: { key: "1", fields: { status: { name: "Started" } } }, namesHash: "123" }),
        doneDbIssue,
      ],
      searchNames: [getFakeDbJiraSearchNames({ hash: "123" })],
    })

    const { yieldJiraSearchIssues } = await getJiraSearchDataYielder(client, { includeStatuses: ["Done"] })

    assertEquals((await asyncSingle(yieldJiraSearchIssues)).id, doneDbIssue.issue.id)
  })

  await t.step("can include only specified types", async () => {
    const storyDbIssue = getFakeDbJiraSearchIssue({
      issue: { key: "2", fields: { issuetype: { name: "Story" } } },
      namesHash: "123",
    })
    const client = await createFakeReadonlyJiraClient({
      syncs: [getFakeJiraSyncInfo({ type: "search" })],
      searchIssues: [
        getFakeDbJiraSearchIssue({ issue: { key: "1", fields: { issuetype: { name: "Bug" } } }, namesHash: "123" }),
        storyDbIssue,
      ],
      searchNames: [getFakeDbJiraSearchNames({ hash: "123" })],
    })

    const { yieldJiraSearchIssues } = await getJiraSearchDataYielder(client, { includeTypes: ["Story"] })

    assertEquals((await asyncSingle(yieldJiraSearchIssues)).id, storyDbIssue.issue.id)
  })

  await t.step("can sort by field", async () => {
    const client = await createFakeReadonlyJiraClient({
      syncs: [getFakeJiraSyncInfo({ type: "search" })],
      searchIssues: [
        getFakeDbJiraSearchIssue({ issue: { key: "1", fields: { foo: null } } }),
        getFakeDbJiraSearchIssue({ issue: { key: "2", fields: { foo: "2000-01-01" } } }),
        getFakeDbJiraSearchIssue({ issue: { key: "3", fields: { foo: "1999-01-01" } } }),
        getFakeDbJiraSearchIssue({ issue: { key: "4", fields: { foo: "2001-01-01" } } }),
      ],
      searchNames: [getFakeDbJiraSearchNames()],
    })

    const { yieldJiraSearchIssues } = await getJiraSearchDataYielder(client, {
      sortBy: { key: "fields.foo", type: "date" },
    })
    const results = await asyncToArray(yieldJiraSearchIssues)
    assertEquals(results.map((el) => el.key), ["3", "2", "4", "1"])
  })

  await t.step("translates field keys via search names", async () => {
    const dbIssue = getFakeDbJiraSearchIssue({
      issue: { fields: { updated: "1970-01-10T00:00:00.000+0000" } },
      namesHash: "123",
    })
    const dbNames = getFakeDbJiraSearchNames({
      names: { "customfield_19175": "Foo Bar", "updated": "Updated" },
      hash: dbIssue.namesHash,
    })
    const client = await createFakeReadonlyJiraClient({
      syncs: [getFakeJiraSyncInfo({ type: "search" })],
      searchIssues: [dbIssue],
      searchNames: [dbNames],
    })

    const { yieldJiraSearchIssues } = await getJiraSearchDataYielder(client)
    const result = await asyncSingle(yieldJiraSearchIssues)

    assertArrayIncludes(Object.keys(result.fields!), ["Foo Bar", "Updated"])
  })
})
