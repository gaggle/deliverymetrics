import { ExtractedStateTransition, yieldJiraTransitionData } from "../../libs/metrics/jira-transition-data.ts"

import { formatDuration, toDaysRounded } from "../../utils/date-utils.ts"

export const jiraTransitionDataHeaders = [
  "Type",
  "From",
  "To",
  "Duration (in days)",
  "Duration (in ms)",
  "Duration",
  "Created",
  "By",
] as const

export async function* jiraTransitionDatasAsCsv(
  transitionDataYielder: ReturnType<typeof yieldJiraTransitionData>,
): AsyncGenerator<Record<typeof jiraTransitionDataHeaders[number], string>> {
  for await (const el of transitionDataYielder) {
    yield jiraTransitionDataAsCsv(el)
  }
}

export function jiraTransitionDataAsCsv(
  jiraTransition: ExtractedStateTransition,
): Record<typeof jiraTransitionDataHeaders[number], string> {
  const durationString = jiraTransition.duration === undefined ? "" : formatDuration(jiraTransition.duration)
  return {
    Type: jiraTransition.type,
    From: jiraTransition.fromString || "",
    To: jiraTransition.toString || "",
    "Duration (in days)": jiraTransition.duration ? toDaysRounded(jiraTransition.duration).toString() : "",
    "Duration (in ms)": jiraTransition.duration?.toString() || "",
    "Duration": durationString,
    Created: new Date(jiraTransition.created).toISOString(),
    By: `${jiraTransition.displayName} (${jiraTransition.emailAddress})`,
  }
}
