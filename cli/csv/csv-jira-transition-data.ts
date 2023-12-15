import { yieldJiraTransitionData } from "../../libs/metrics/jira-transition-data.ts"

export const jiraTransitionDataHeaders = [
  "Type",
  "Key",
  "Summary",
  "Status",
  "From",
  "To",
  "Created",
  "By",
] as const

export async function* jiraTransitionDataAsCsv(
  transitionDataYielder: ReturnType<typeof yieldJiraTransitionData>,
): AsyncGenerator<Record<typeof jiraTransitionDataHeaders[number], string>> {
  for await (const el of transitionDataYielder) {
    yield {
      Type: el.type,
      Key: el.issue.key || "",
      Summary: el.issue.fields?.Summary || "",
      Status: el.issue.fields?.Status?.name || "",
      From: el.fromString || "",
      To: el.toString || "",
      Created: new Date(el.created).toISOString(),
      By: `${el.displayName} (${el.emailAddress})`,
    }
  }
}
