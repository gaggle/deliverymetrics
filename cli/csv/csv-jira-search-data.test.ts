import { assertArrayIncludes, assertEquals } from "dev:asserts"

import { getFakeDbJiraSearchIssue, getFakeDbJiraSearchNames, getFakeJiraIssue } from "../../libs/jira/api/search/mod.ts"

import { arraySubtract, arrayToAsyncGenerator, asyncSingle, flattenObject, omit } from "../../libs/utils/mod.ts"
import { createFakeReadonlyJiraClient, getFakeJiraSyncInfo } from "../../libs/jira/mod.ts"
import { getJiraSearchDataYielder } from "../../libs/metrics/mod.ts"

import { ignoreHeaders, jiraSearchDataHeaders, jiraSearchDataIssuesAsCsv } from "./csv-jira-search-data.ts"

Deno.test("jiraSearchDataIssuesAsCsv", async (t) => {
  await t.step("converts Jira issue to a csv row", async () => {
    const fakeJiraIssue = getFakeJiraIssue({
      changelog: {
        histories: [{
          created: "2023-07-10T16:00:34.199+0100",
          author: {
            active: true,
            displayName: "displayName",
            emailAddress: "emailAddress",
          },
          items: [
            {
              field: "field",
              fieldtype: "fieldtype",
              fieldId: "fieldId",
              from: null,
              fromString: null,
              to: "to",
              toString: "toString",
            },
          ],
        }],
      },
      fields: {
        customfield_19175: "2023-07-10",
        customfield_foo: null,
        description: "description",
        status: {
          "self": "https://atlassian.net/rest/api/2/status/24512",
          "description": "",
          "iconUrl": "https://atlassian.net/",
          "name": "Finished",
          "id": "24512",
          "statusCategory": {
            "self": "https://atlassian.net/rest/api/2/statuscategory/3",
            "id": 3,
            "key": "done",
            "colorName": "green",
            "name": "Done",
          },
        },
      },
    })

    const result = await asyncSingle(jiraSearchDataIssuesAsCsv(arrayToAsyncGenerator([fakeJiraIssue])))

    const fieldsThatAreTooLongToTest = [
      "fields.creator.avatarUrls.16x16",
      "fields.creator.avatarUrls.24x24",
      "fields.creator.avatarUrls.32x32",
      "fields.creator.avatarUrls.48x48",
      "fields.reporter.avatarUrls.16x16",
      "fields.reporter.avatarUrls.24x24",
      "fields.reporter.avatarUrls.32x32",
      "fields.reporter.avatarUrls.48x48",
    ]
    assertArrayIncludes(Object.keys(result), fieldsThatAreTooLongToTest)
    assertEquals(omit(result, ...fieldsThatAreTooLongToTest), {
      "Changelog Histories": "altered field to toString",
      "Transitions": "transitioned to In Progress; transitioned to Done",
      "Transitions Count": "1",
      "changelog.maxResults": "1",
      "changelog.startAt": "0",
      "changelog.total": "1",
      "expand": "operations,versionedRepresentations,editmeta,changelog,transitions,renderedFields",
      "fields.aggregateprogress.progress": "0",
      "fields.aggregateprogress.total": "0",
      "fields.aggregatetimeestimate": "null",
      "fields.aggregatetimeoriginalestimate": "null",
      "fields.aggregatetimespent": "null",
      "fields.assignee": "null",
      "fields.components": "",
      "fields.created": "2023-07-10T08:38:16.344+0100",
      "fields.creator.accountId": "123a1aabb123ab0123a1a111",
      "fields.creator.accountType": "atlassian",
      "fields.creator.active": "true",
      "fields.creator.displayName": "Mr. Example",
      "fields.creator.emailAddress": "example@atlassian.com",
      "fields.creator.self": "https://atlassian.net/rest/api/2/user?accountId=123a1aabb123ab0123a1a111",
      "fields.creator.timeZone": "Europe/London",
      "fields.customfield_19175": "2023-07-10",
      "fields.customfield_foo": "null",
      "fields.description": "description",
      "fields.duedate": "null",
      "fields.environment": "null",
      "fields.fixVersions": "",
      "fields.issuelinks": "",
      "fields.issuetype.avatarId": "10315",
      "fields.issuetype.description": "Created by Jira Agile - do not edit or delete. Issue type for a user story.",
      "fields.issuetype.entityId": "8bd99e7d-c377-4f14-8035-a976352a0189",
      "fields.issuetype.hierarchyLevel": "0",
      "fields.issuetype.iconUrl":
        "https://atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium",
      "fields.issuetype.id": "19094",
      "fields.issuetype.name": "Story",
      "fields.issuetype.self": "https://atlassian.net/rest/api/2/issuetype/19094",
      "fields.issuetype.subtask": "false",
      "fields.labels": "",
      "fields.lastViewed": "2023-07-10T22:43:59.072+0100",
      "fields.parent.fields.issuetype.avatarId": "10307",
      "fields.parent.fields.issuetype.description": "A collection of related bugs, stories, and tasks.",
      "fields.parent.fields.issuetype.entityId": "67ef4bef-2f1e-4dba-8056-53eb8c451b21",
      "fields.parent.fields.issuetype.hierarchyLevel": "1",
      "fields.parent.fields.issuetype.iconUrl":
        "https://atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10307?size=medium",
      "fields.parent.fields.issuetype.id": "19083",
      "fields.parent.fields.issuetype.name": "Epic",
      "fields.parent.fields.issuetype.self": "https://atlassian.net/rest/api/2/issuetype/19083",
      "fields.parent.fields.issuetype.subtask": "false",
      "fields.parent.fields.priority.iconUrl": "https://atlassian.net/images/icons/priorities/medium.svg",
      "fields.parent.fields.priority.id": "3",
      "fields.parent.fields.priority.name": "Medium",
      "fields.parent.fields.priority.self": "https://atlassian.net/rest/api/2/priority/3",
      "fields.parent.fields.status.description": "",
      "fields.parent.fields.status.iconUrl": "https://atlassian.net/",
      "fields.parent.fields.status.id": "25814",
      "fields.parent.fields.status.name": "Refining",
      "fields.parent.fields.status.self": "https://atlassian.net/rest/api/2/status/25814",
      "fields.parent.fields.status.statusCategory.colorName": "yellow",
      "fields.parent.fields.status.statusCategory.id": "4",
      "fields.parent.fields.status.statusCategory.key": "indeterminate",
      "fields.parent.fields.status.statusCategory.name": "In Progress",
      "fields.parent.fields.status.statusCategory.self": "https://atlassian.net/rest/api/2/statuscategory/4",
      "fields.parent.fields.summary": "Parent",
      "fields.parent.id": "9876543",
      "fields.parent.key": "PRD-2",
      "fields.parent.self": "https://atlassian.net/rest/api/2/issue/9876543",
      "fields.priority.iconUrl": "https://atlassian.net/images/icons/priorities/medium.svg",
      "fields.priority.id": "3",
      "fields.priority.name": "Medium",
      "fields.priority.self": "https://atlassian.net/rest/api/2/priority/3",
      "fields.progress.progress": "0",
      "fields.progress.total": "0",
      "fields.project.avatarUrls.16x16":
        "https://atlassian.net/rest/api/2/universal_avatar/view/type/project/avatar/24641?size=xsmall",
      "fields.project.avatarUrls.24x24":
        "https://atlassian.net/rest/api/2/universal_avatar/view/type/project/avatar/24641?size=small",
      "fields.project.avatarUrls.32x32":
        "https://atlassian.net/rest/api/2/universal_avatar/view/type/project/avatar/24641?size=medium",
      "fields.project.avatarUrls.48x48":
        "https://atlassian.net/rest/api/2/universal_avatar/view/type/project/avatar/24641",
      "fields.project.id": "12340",
      "fields.project.key": "PRD",
      "fields.project.name": "Project",
      "fields.project.projectTypeKey": "software",
      "fields.project.self": "https://atlassian.net/rest/api/2/project/23300",
      "fields.project.simplified": "true",
      "fields.reporter.accountId": "123a1aabb123ab0123a1a111",
      "fields.reporter.accountType": "atlassian",
      "fields.reporter.active": "true",
      "fields.reporter.displayName": "Mr. Example",
      "fields.reporter.emailAddress": "example@atlassian.com",
      "fields.reporter.self": "https://atlassian.net/rest/api/2/user?accountId=123a1aabb123ab0123a1a111",
      "fields.reporter.timeZone": "Europe/London",
      "fields.resolution.description": "Work has been completed on this issue.",
      "fields.resolution.id": "10000",
      "fields.resolution.name": "Done",
      "fields.resolution.self": "https://atlassian.net/rest/api/2/resolution/10000",
      "fields.resolutiondate": "2023-07-10T16:00:34.172+0100",
      "fields.security": "null",
      "fields.status.description": "",
      "fields.status.iconUrl": "https://atlassian.net/",
      "fields.status.id": "24512",
      "fields.status.name": "Finished",
      "fields.status.self": "https://atlassian.net/rest/api/2/status/24512",
      "fields.status.statusCategory.colorName": "green",
      "fields.status.statusCategory.id": "3",
      "fields.status.statusCategory.key": "done",
      "fields.status.statusCategory.name": "Done",
      "fields.status.statusCategory.self": "https://atlassian.net/rest/api/2/statuscategory/3",
      "fields.statuscategorychangedate": "2023-07-10T16:00:34.180+0100",
      "fields.subtasks": "",
      "fields.summary": "Summary",
      "fields.timeestimate": "null",
      "fields.timeoriginalestimate": "null",
      "fields.timespent": "null",
      "fields.updated": "2023-07-10T16:00:34.869+0100",
      "fields.versions": "",
      "fields.votes.hasVoted": "false",
      "fields.votes.self": "https://atlassian.net/rest/api/2/issue/PRD-1/votes",
      "fields.votes.votes": "0",
      "fields.watches.isWatching": "false",
      "fields.watches.self": "https://atlassian.net/rest/api/2/issue/PRD-1/watchers",
      "fields.watches.watchCount": "1",
      "fields.workratio": "-1",
      "id": "1234567",
      "key": "PRD-1",
      "self": "https://atlassian.net/rest/api/2/issue/1234567",
    })
  })

  await t.step("limits description length", async () => {
    const fakeJiraIssue = getFakeJiraIssue({ fields: { description: "123456789" } })
    const result = await asyncSingle(
      jiraSearchDataIssuesAsCsv(arrayToAsyncGenerator([fakeJiraIssue]), { maxDescriptionLength: 4 }),
    )
    assertEquals(result["fields.description"], "1234... 5 more characters")
  })
})

Deno.test("jiraSearchDataHeaders", async (t) => {
  const expectedFixedHeaders = [
    "Changelog Histories",
    "Transitions",
    "Transitions Count",
    "changelog.maxResults",
    "changelog.startAt",
    "changelog.total",
    "expand",
    "fields.description",
    "fields.issuetype.avatarId",
    "fields.issuetype.description",
    "fields.issuetype.entityId",
    "fields.issuetype.hierarchyLevel",
    "fields.issuetype.iconUrl",
    "fields.issuetype.id",
    "fields.issuetype.name",
    "fields.issuetype.self",
    "fields.issuetype.subtask",
    "fields.status.description",
    "fields.status.iconUrl",
    "fields.status.id",
    "fields.status.name",
    "fields.status.self",
    "fields.status.statusCategory.colorName",
    "fields.status.statusCategory.id",
    "fields.status.statusCategory.key",
    "fields.status.statusCategory.name",
    "fields.status.statusCategory.self",
    "id",
    "key",
    "operations.linkGroups",
    "self",
  ]

  await t.step("returns fixed headers by default", () => {
    const result = jiraSearchDataHeaders()

    assertEquals(result, expectedFixedHeaders)
  })

  await t.step("adds", () => {
    const result = jiraSearchDataHeaders({
      fieldKeys: ["fields.created", "fields.updated", "fields.summary", "fields.description", "fields.foo"],
    })

    assertEquals(result, [
      ...expectedFixedHeaders,
      "fields.created",
      "fields.updated",
      "fields.summary",
      "fields.foo",
    ])
  })

  await t.step("can use metrics/getJiraSearchDataYielder to calculate csv row and headers", async () => {
    const { fieldKeys, fieldKeysToNames, yieldJiraSearchIssues } = await getJiraSearchDataYielder(
      await createFakeReadonlyJiraClient({
        syncs: [getFakeJiraSyncInfo({ type: "search" })],
        searchIssues: [getFakeDbJiraSearchIssue({ namesHash: "123" })],
        searchNames: [getFakeDbJiraSearchNames({ hash: "123" })],
      }),
    )

    const issue = await asyncSingle(jiraSearchDataIssuesAsCsv(yieldJiraSearchIssues))
    const headers = jiraSearchDataHeaders({ fieldKeys, fieldKeysToNames })
    const flattenedIssueKeys = Object.keys(flattenObject(issue))

    const issueKeysNotRepresentedInNames = arraySubtract(arraySubtract(flattenedIssueKeys, headers), ignoreHeaders)
    assertEquals(issueKeysNotRepresentedInNames, [])

    const headersNotRepresentedInIssueKeys = arraySubtract(headers, flattenedIssueKeys)
    assertEquals(headersNotRepresentedInIssueKeys, ["operations.linkGroups"])
  })
})
