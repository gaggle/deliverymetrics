import { deepMerge } from "std:deep-merge"

import { DeepPartial } from "../../../types.ts"

import { JiraSearchIssue } from "./jira-search-schema.ts"

export function getFakeJiraIssue(partial: DeepPartial<JiraSearchIssue> = {}): JiraSearchIssue {
  const base: JiraSearchIssue = {
    "expand": "operations,versionedRepresentations,editmeta,changelog,renderedFields",
    "id": "1234567",
    "self": "https://atlassian.net/rest/api/2/issue/1234567",
    "key": "PRD-1",
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
  return deepMerge(base, partial as JiraSearchIssue)
}
