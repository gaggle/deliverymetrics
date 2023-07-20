import { assertEquals } from "dev:asserts"

import { getFakeDbJiraSearchIssue, getFakeDbJiraSearchNames } from "../jira/api/search/mod.ts"

import { asyncToArray } from "../utils/mod.ts"
import { createFakeReadonlyJiraClient, getFakeJiraSyncInfo } from "../jira/mod.ts"

import { getJiraSearchDataYielder } from "./jira-search-data.ts"

Deno.test("getJiraSearchDataYielder", async (t) => {
  await t.step("fieldKeys", async (t) => {
    await t.step("returns all field keys", async () => {
      const dbIssue = getFakeDbJiraSearchIssue({
        issue: { fields: { updated: "1970-01-10T00:00:00.000+0000" } },
        namesHash: "123",
      })
      const dbNames = getFakeDbJiraSearchNames({
        names: { "customfield_22118": "Foo Bar", "updated": "Updated" },
        hash: dbIssue.namesHash,
      })
      const client = await createFakeReadonlyJiraClient({
        syncs: [getFakeJiraSyncInfo({ type: "search" })],
        searchIssues: [dbIssue],
        searchNames: [dbNames],
      })

      const { fieldKeys } = await getJiraSearchDataYielder(client)

      assertEquals(fieldKeys, [
        "fields.aggregatetimeoriginalestimate",
        "fields.subtasks",
        "fields.timeestimate",
        "fields.aggregatetimespent",
        "fields.labels",
        "fields.reporter.self",
        "fields.reporter.accountId",
        "fields.reporter.emailAddress",
        "fields.reporter.avatarUrls.48x48",
        "fields.reporter.avatarUrls.24x24",
        "fields.reporter.avatarUrls.16x16",
        "fields.reporter.avatarUrls.32x32",
        "fields.reporter.displayName",
        "fields.reporter.active",
        "fields.reporter.timeZone",
        "fields.reporter.accountType",
        "fields.statuscategorychangedate",
        "fields.priority.self",
        "fields.priority.iconUrl",
        "fields.priority.name",
        "fields.priority.id",
        "fields.created",
        "fields.assignee",
        "fields.status.self",
        "fields.status.description",
        "fields.status.iconUrl",
        "fields.status.name",
        "fields.status.id",
        "fields.status.statusCategory.self",
        "fields.status.statusCategory.id",
        "fields.status.statusCategory.key",
        "fields.status.statusCategory.colorName",
        "fields.status.statusCategory.name",
        "fields.timespent",
        "fields.components",
        "fields.progress.progress",
        "fields.progress.total",
        "fields.project.self",
        "fields.project.id",
        "fields.project.key",
        "fields.project.name",
        "fields.project.projectTypeKey",
        "fields.project.simplified",
        "fields.project.avatarUrls.48x48",
        "fields.project.avatarUrls.24x24",
        "fields.project.avatarUrls.16x16",
        "fields.project.avatarUrls.32x32",
        "fields.issuetype.self",
        "fields.issuetype.id",
        "fields.issuetype.description",
        "fields.issuetype.iconUrl",
        "fields.issuetype.name",
        "fields.issuetype.subtask",
        "fields.issuetype.avatarId",
        "fields.issuetype.entityId",
        "fields.issuetype.hierarchyLevel",
        "fields.environment",
        "fields.workratio",
        "fields.timeoriginalestimate",
        "fields.customfield_19175",
        "fields.parent.id",
        "fields.parent.key",
        "fields.parent.self",
        "fields.parent.fields.summary",
        "fields.parent.fields.status.self",
        "fields.parent.fields.status.description",
        "fields.parent.fields.status.iconUrl",
        "fields.parent.fields.status.name",
        "fields.parent.fields.status.id",
        "fields.parent.fields.status.statusCategory.self",
        "fields.parent.fields.status.statusCategory.id",
        "fields.parent.fields.status.statusCategory.key",
        "fields.parent.fields.status.statusCategory.colorName",
        "fields.parent.fields.status.statusCategory.name",
        "fields.parent.fields.priority.self",
        "fields.parent.fields.priority.iconUrl",
        "fields.parent.fields.priority.name",
        "fields.parent.fields.priority.id",
        "fields.parent.fields.issuetype.self",
        "fields.parent.fields.issuetype.id",
        "fields.parent.fields.issuetype.description",
        "fields.parent.fields.issuetype.iconUrl",
        "fields.parent.fields.issuetype.name",
        "fields.parent.fields.issuetype.subtask",
        "fields.parent.fields.issuetype.avatarId",
        "fields.parent.fields.issuetype.entityId",
        "fields.parent.fields.issuetype.hierarchyLevel",
        "fields.votes.self",
        "fields.votes.votes",
        "fields.votes.hasVoted",
        "fields.duedate",
        "fields.aggregateprogress.progress",
        "fields.aggregateprogress.total",
        "fields.security",
        "fields.lastViewed",
        "fields.issuelinks",
        "fields.updated",
        "fields.summary",
        "fields.versions",
        "fields.resolution.self",
        "fields.resolution.id",
        "fields.resolution.description",
        "fields.resolution.name",
        "fields.watches.self",
        "fields.watches.watchCount",
        "fields.watches.isWatching",
        "fields.description",
        "fields.fixVersions",
        "fields.aggregatetimeestimate",
        "fields.creator.self",
        "fields.creator.accountId",
        "fields.creator.emailAddress",
        "fields.creator.avatarUrls.48x48",
        "fields.creator.avatarUrls.24x24",
        "fields.creator.avatarUrls.16x16",
        "fields.creator.avatarUrls.32x32",
        "fields.creator.displayName",
        "fields.creator.active",
        "fields.creator.timeZone",
        "fields.creator.accountType",
        "fields.resolutiondate",
      ])
    })
  })

  await t.step("fieldKeysToNames", async (t) => {
    await t.step("returns all names", async () => {
      const dbIssue = getFakeDbJiraSearchIssue({
        issue: { fields: { updated: "1970-01-10T00:00:00.000+0000" } },
        namesHash: "123",
      })
      const dbNames = getFakeDbJiraSearchNames({
        names: { "customfield_22118": "Foo Bar", "updated": "Updated" },
        hash: dbIssue.namesHash,
      })
      const client = await createFakeReadonlyJiraClient({
        syncs: [getFakeJiraSyncInfo({ type: "search" })],
        searchIssues: [dbIssue],
        searchNames: [dbNames],
      })

      const { fieldKeysToNames } = await getJiraSearchDataYielder(client)

      assertEquals(fieldKeysToNames, { customfield_22118: "Foo Bar", updated: "Updated" })
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
            names: { "customfield_22118": "Foo Bar", "updated": "Updated" },
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
        customfield_22118: "Foo Bar",
        customfield_90210: "Foo Bar",
        updated: "Updated New",
      })
    })
  })

  await t.step("yieldJiraSearchIssues", async (t) => {
    await t.step("returns an async generator of issues", async () => {
      const dbIssue = getFakeDbJiraSearchIssue({
        issue: { fields: { updated: "1970-01-10T00:00:00.000+0000" } },
        namesHash: "123",
      })
      const dbNames = getFakeDbJiraSearchNames({
        names: { "customfield_22118": "Foo Bar", "updated": "Updated" },
        hash: dbIssue.namesHash,
      })
      const client = await createFakeReadonlyJiraClient({
        syncs: [getFakeJiraSyncInfo({ type: "search" })],
        searchIssues: [dbIssue],
        searchNames: [dbNames],
      })

      const { yieldJiraSearchIssues } = await getJiraSearchDataYielder(client)

      assertEquals(await asyncToArray(yieldJiraSearchIssues), [dbIssue.issue])
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
          names: { "customfield_22118": "Foo Bar", "updated": "Updated" },
          hash: "123",
        })],
      })

      const { yieldJiraSearchIssues } = await getJiraSearchDataYielder(client, { maxDays: 10 })

      assertEquals((await asyncToArray(yieldJiraSearchIssues)).length, 1)
    })
  })
})
