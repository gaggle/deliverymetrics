import { deepMerge } from "std:deep-merge"

import { DeepPartial } from "../../../../utils/types.ts"

import { DBJiraSearchIssue, DBJiraSearchNames, JiraSearchIssue, JiraSearchNames } from "./jira-search-schema.ts"

export function getFakeJiraIssue(partial: DeepPartial<JiraSearchIssue> = {}): JiraSearchIssue {
  const base: JiraSearchIssue = {
    "expand": "operations,versionedRepresentations,editmeta,changelog,transitions,renderedFields",
    "id": "1234567",
    "self": "https://atlassian.net/rest/api/2/issue/1234567",
    "key": "PRD-1",
    "transitions": [
      {
        "id": "2",
        "name": "In Progress",
        "to": {
          "self": "https://atlassian.net/rest/api/2/status/24516",
          "description": "",
          "iconUrl": "https://atlassian.net/",
          "name": "In Progress",
          "id": "24516",
          "statusCategory": {
            "self": "https://atlassian.net/rest/api/2/statuscategory/4",
            "id": 4,
            "key": "indeterminate",
            "colorName": "yellow",
            "name": "In Progress",
          },
        },
        "hasScreen": false,
        "isGlobal": true,
        "isInitial": false,
        "isAvailable": true,
        "isConditional": false,
        "isLooped": false,
      },
      {
        "id": "31",
        "name": "Done",
        "to": {
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
        "hasScreen": false,
        "isGlobal": true,
        "isInitial": false,
        "isAvailable": true,
        "isConditional": false,
        "isLooped": false,
      },
    ],
    "changelog": {
      "startAt": 0,
      "maxResults": partial.changelog?.histories?.length || 16,
      "total": partial.changelog?.histories?.length || 16,
      "histories": [
        {
          "id": "28256596",
          "author": {
            "self": "https://atlassian.net/rest/api/2/user?accountId=123a1aabb123ab0123a1a111",
            "accountId": "123a1aabb123ab0123a1a111",
            "emailAddress": "example@atlassian.com",
            "avatarUrls": {
              "48x48":
                "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/75fa9dbe-709b-4b6e-9cea-101f92312337/48",
              "24x24":
                "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/75fa9dbe-709b-4b6e-9cea-101f92312337/24",
              "16x16":
                "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/75fa9dbe-709b-4b6e-9cea-101f92312337/16",
              "32x32":
                "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/75fa9dbe-709b-4b6e-9cea-101f92312337/32",
            },
            "displayName": "Mr. Example",
            "active": true,
            "timeZone": "Europe/London",
            "accountType": "atlassian",
          },
          "created": "2023-07-10T16:00:34.199+0100",
          "items": [
            {
              "field": "resolution",
              "fieldtype": "jira",
              "fieldId": "resolution",
              "from": null,
              "fromString": null,
              "to": "10000",
              "toString": "Done",
            },
            {
              "field": "status",
              "fieldtype": "jira",
              "fieldId": "status",
              "from": "25813",
              "fromString": "Review in Prod",
              "to": "24512",
              "toString": "Finished",
            },
          ],
        },
        {
          "id": "28234111",
          "author": {
            "self": "https://atlassian.net/rest/api/2/user?accountId=123a1aabb123ab0123a1a111",
            "accountId": "123a1aabb123ab0123a1a111",
            "emailAddress": "example@atlassian.com",
            "avatarUrls": {
              "48x48":
                "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/75fa9dbe-709b-4b6e-9cea-101f92312337/48",
              "24x24":
                "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/75fa9dbe-709b-4b6e-9cea-101f92312337/24",
              "16x16":
                "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/75fa9dbe-709b-4b6e-9cea-101f92312337/16",
              "32x32":
                "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/75fa9dbe-709b-4b6e-9cea-101f92312337/32",
            },
            "displayName": "Mr. Example",
            "active": true,
            "timeZone": "Europe/London",
            "accountType": "atlassian",
          },
          "created": "2023-07-10T09:10:09.462+0100",
          "items": [
            {
              "field": "description",
              "fieldtype": "jira",
              "fieldId": "description",
              "from": null,
              "fromString": "h1. Title\n\nThis is a description",
              "to": null,
              "toString": "h3. Title\n\nThis is a description",
            },
          ],
        },
        {
          "id": "28234095",
          "author": {
            "self": "https://atlassian.net/rest/api/2/user?accountId=123a1aabb123ab0123a1a111",
            "accountId": "123a1aabb123ab0123a1a111",
            "emailAddress": "example@atlassian.com",
            "avatarUrls": {
              "48x48":
                "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/75fa9dbe-709b-4b6e-9cea-101f92312337/48",
              "24x24":
                "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/75fa9dbe-709b-4b6e-9cea-101f92312337/24",
              "16x16":
                "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/75fa9dbe-709b-4b6e-9cea-101f92312337/16",
              "32x32":
                "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/75fa9dbe-709b-4b6e-9cea-101f92312337/32",
            },
            "displayName": "Mr. Example",
            "active": true,
            "timeZone": "Europe/London",
            "accountType": "atlassian",
          },
          "created": "2023-07-10T09:09:55.816+0100",
          "items": [
            {
              "field": "summary",
              "fieldtype": "jira",
              "fieldId": "summary",
              "from": null,
              "fromString": "Emissions Workbench look and feel",
              "to": null,
              "toString": "Create Emissions Workbench look and feel",
            },
          ],
        },
      ],
    },
    "fields": {
      "aggregatetimeoriginalestimate": null,
      "subtasks": [],
      "timeestimate": null,
      "aggregatetimespent": null,
      "labels": [],
      "reporter": {
        "self": "https://atlassian.net/rest/api/2/user?accountId=123a1aabb123ab0123a1a111",
        "accountId": "123a1aabb123ab0123a1a111",
        "emailAddress": "example@atlassian.com",
        "avatarUrls": {
          "48x48":
            "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/12ab1abc-123a-1a2b-1abc-123a45678901/48",
          "24x24":
            "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/12ab1abc-123a-1a2b-1abc-123a45678901/24",
          "16x16":
            "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/12ab1abc-123a-1a2b-1abc-123a45678901/16",
          "32x32":
            "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/12ab1abc-123a-1a2b-1abc-123a45678901/32",
        },
        "displayName": "Mr. Example",
        "active": true,
        "timeZone": "Europe/London",
        "accountType": "atlassian",
      },
      "statuscategorychangedate": "2023-07-10T16:00:34.180+0100",
      "priority": {
        "self": "https://atlassian.net/rest/api/2/priority/3",
        "iconUrl": "https://atlassian.net/images/icons/priorities/medium.svg",
        "name": "Medium",
        "id": "3",
      },
      "created": "2023-07-10T08:38:16.344+0100",
      "assignee": null,
      "status": {
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
      "timespent": null,
      "components": [],
      "progress": {
        "progress": 0,
        "total": 0,
      },
      "project": {
        "self": "https://atlassian.net/rest/api/2/project/23300",
        "id": "12340",
        "key": "PRD",
        "name": "Project",
        "projectTypeKey": "software",
        "simplified": true,
        "avatarUrls": {
          "48x48": "https://atlassian.net/rest/api/2/universal_avatar/view/type/project/avatar/24641",
          "24x24": "https://atlassian.net/rest/api/2/universal_avatar/view/type/project/avatar/24641?size=small",
          "16x16": "https://atlassian.net/rest/api/2/universal_avatar/view/type/project/avatar/24641?size=xsmall",
          "32x32": "https://atlassian.net/rest/api/2/universal_avatar/view/type/project/avatar/24641?size=medium",
        },
      },
      "issuetype": {
        "self": "https://atlassian.net/rest/api/2/issuetype/19094",
        "id": "19094",
        "description": "Created by Jira Agile - do not edit or delete. Issue type for a user story.",
        "iconUrl": "https://atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium",
        "name": "Story",
        "subtask": false,
        "avatarId": 10315,
        "entityId": "8bd99e7d-c377-4f14-8035-a976352a0189",
        "hierarchyLevel": 0,
      },
      "environment": null,
      "workratio": -1,
      "timeoriginalestimate": null,
      "customfield_19175": "2023-07-10",
      "parent": {
        "id": "9876543",
        "key": "PRD-2",
        "self": "https://atlassian.net/rest/api/2/issue/9876543",
        "fields": {
          "summary": "Parent",
          "status": {
            "self": "https://atlassian.net/rest/api/2/status/25814",
            "description": "",
            "iconUrl": "https://atlassian.net/",
            "name": "Refining",
            "id": "25814",
            "statusCategory": {
              "self": "https://atlassian.net/rest/api/2/statuscategory/4",
              "id": 4,
              "key": "indeterminate",
              "colorName": "yellow",
              "name": "In Progress",
            },
          },
          "priority": {
            "self": "https://atlassian.net/rest/api/2/priority/3",
            "iconUrl": "https://atlassian.net/images/icons/priorities/medium.svg",
            "name": "Medium",
            "id": "3",
          },
          "issuetype": {
            "self": "https://atlassian.net/rest/api/2/issuetype/19083",
            "id": "19083",
            "description": "A collection of related bugs, stories, and tasks.",
            "iconUrl": "https://atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10307?size=medium",
            "name": "Epic",
            "subtask": false,
            "avatarId": 10307,
            "entityId": "67ef4bef-2f1e-4dba-8056-53eb8c451b21",
            "hierarchyLevel": 1,
          },
        },
      },
      "votes": {
        "self": "https://atlassian.net/rest/api/2/issue/PRD-1/votes",
        "votes": 0,
        "hasVoted": false,
      },
      "duedate": null,
      "aggregateprogress": {
        "progress": 0,
        "total": 0,
      },
      "security": null,
      "lastViewed": "2023-07-10T22:43:59.072+0100",
      "issuelinks": [],
      "updated": "2023-07-10T16:00:34.869+0100",
      "summary": "Summary",
      "versions": [],
      "resolution": {
        "self": "https://atlassian.net/rest/api/2/resolution/10000",
        "id": "10000",
        "description": "Work has been completed on this issue.",
        "name": "Done",
      },
      "watches": {
        "self": "https://atlassian.net/rest/api/2/issue/PRD-1/watchers",
        "watchCount": 1,
        "isWatching": false,
      },
      "description": "h3. Title\n\nThis is a description",
      "fixVersions": [],
      "aggregatetimeestimate": null,
      "creator": {
        "self": "https://atlassian.net/rest/api/2/user?accountId=123a1aabb123ab0123a1a111",
        "accountId": "123a1aabb123ab0123a1a111",
        "emailAddress": "example@atlassian.com",
        "avatarUrls": {
          "48x48":
            "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/12ab1abc-123a-1a2b-1abc-123a45678901/48",
          "24x24":
            "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/12ab1abc-123a-1a2b-1abc-123a45678901/24",
          "16x16":
            "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/12ab1abc-123a-1a2b-1abc-123a45678901/16",
          "32x32":
            "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123a1aabb123ab0123a1a111/12ab1abc-123a-1a2b-1abc-123a45678901/32",
        },
        "displayName": "Mr. Example",
        "active": true,
        "timeZone": "Europe/London",
        "accountType": "atlassian",
      },
      "resolutiondate": "2023-07-10T16:00:34.172+0100",
    },
  }
  if (partial.transitions) {
    base.transitions = partial.transitions
    delete partial.transitions
  }
  if (partial.changelog) {
    base.changelog = deepMerge(base.changelog!, partial.changelog)
    if (partial.changelog.histories) {
      base.changelog.histories = partial.changelog.histories
      delete partial.changelog.histories
    }
    delete partial.changelog
  }
  if (partial.fields) {
    base.fields = deepMerge(base.fields!, partial.fields)
    if (partial.fields.status) {
      base.fields.status = partial.fields.status
      delete partial.fields.status
    }
    delete partial.fields
  }
  return deepMerge(base, partial as JiraSearchIssue)
}

export function getFakeDbJiraSearchIssue(partial: DeepPartial<DBJiraSearchIssue> = {}): DBJiraSearchIssue {
  const base = getFakeJiraIssue(partial.issue)
  return {
    issue: base,
    issueId: base.id || partial.issueId,
    issueKey: base.key || partial.issueKey,
    namesHash: "123" || partial.namesHash,
  }
}

export function getFakeJiraSearchNames(partial: DeepPartial<JiraSearchNames> = {}): JiraSearchNames {
  const base: JiraSearchNames = {
    "aggregatetimeoriginalestimate": "Σ Original Estimate",
    "subtasks": "Sub-tasks",
    "customfield_19175": "In Progress Date",
    "timeestimate": "Remaining Estimate",
    "aggregatetimespent": "Σ Time Spent",
    "labels": "Labels",
    "reporter": "Reporter",
    "statuscategorychangedate": "Status Category Changed",
    "priority": "Priority",
    "created": "Created",
    "assignee": "Assignee",
    "status": "Status",
    "timespent": "Time Spent",
    "components": "Components",
    "progress": "Progress",
    "project": "Project",
    "issuetype": "Issue Type",
    "environment": "Environment",
    "workratio": "Work Ratio",
    "timeoriginalestimate": "Original estimate",
    "parent": "Parent",
    "votes": "Votes",
    "duedate": "Due date",
    "aggregateprogress": "Σ Progress",
    "security": "Security Level",
    "lastViewed": "Last Viewed",
    "issuelinks": "Linked Issues",
    "updated": "Updated",
    "summary": "Summary",
    "versions": "Affects versions",
    "resolution": "Resolution",
    "watches": "Watchers",
    "description": "Description",
    "fixVersions": "Fix versions",
    "aggregatetimeestimate": "Σ Remaining Estimate",
    "creator": "Creator",
    "resolutiondate": "Resolved",
  }

  return deepMerge(base, partial as JiraSearchNames)
}

export function getFakeDbJiraSearchNames(partial: Partial<DBJiraSearchNames> = {}): DBJiraSearchNames {
  let base = getFakeJiraSearchNames()
  if (partial.names) {
    base = partial.names
    delete partial.names
  }
  return deepMerge({ names: base, hash: "123" }, partial as DBJiraSearchNames)
}
