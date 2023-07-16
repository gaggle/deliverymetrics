import { deepMerge } from "std:deep-merge"

import { DeepPartial } from "../../types.ts"

import { JiraRestSpec } from "./jira-rest-api-spec.ts"

export function getFakeJiraRestSearchResponse(
  partial: DeepPartial<JiraRestSpec["search"]["Schema"]> = {},
): JiraRestSpec["search"]["Schema"] {
  const base: JiraRestSpec["search"]["Schema"] = {
    "expand": "names,schema",
    "startAt": 0,
    "maxResults": 50,
    "total": 1,
    "issues": [],
    "names": {
      "aggregatetimeoriginalestimate": "Σ Original Estimate",
      "subtasks": "Sub-tasks",
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
      "customfield_19175": "In Progress Date",
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
    },
  }
  return deepMerge(base, partial as JiraRestSpec["search"]["Schema"])
}
