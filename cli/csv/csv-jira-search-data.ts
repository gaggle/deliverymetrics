import { JiraSearchIssue } from "../../libs/jira/api/search/jira-search-schema.ts"
import { GetJiraSearchDataYielderReturnType } from "../../libs/metrics/mod.ts"

import { arraySubtract, flattenObject, reorganizeHeaders, stringifyObject } from "../../utils/mod.ts"

export const permanentlyIgnoredHeaders = ["changelog.histories", "transitions"]
const extraHeaders = [
  "expand",
  "id",
  "self",
  "key",
  "Component Names",
  "Changelog Histories",
  "Transitions",
  "Transitions Count",
] as const

export async function* jiraSearchDataIssuesAsCsv(
  iter: GetJiraSearchDataYielderReturnType["yieldJiraSearchIssues"],
  opts: Partial<{ maxDescriptionLength: number }> = {},
): AsyncGenerator<Record<typeof extraHeaders[number] | string, string>> {
  for await (const issue of iter) {
    yield jiraSearchDataIssueAsCsv(issue, opts)
  }
}

export function jiraSearchDataIssueAsCsv(
  issue: JiraSearchIssue,
  opts: Partial<{ maxDescriptionLength: number }> = {},
): Record<typeof extraHeaders[number] | string, string> {
  let description = issue.fields?.description
  if (description && opts.maxDescriptionLength !== undefined) {
    const str = description.slice(0, opts.maxDescriptionLength)
    const remaining = description.slice(opts.maxDescriptionLength).length
    description = `${str}... ${remaining} more characters`
  }
  const components: Array<{ name: string }> = issue.fields?.Components || []
  const issueRow = {
    ...stringifyObject(flattenObject(issue), { stringifyUndefined: true }),
    "Component Names": components.map((component) => component.name).join("; "),
    "Changelog Histories": issue.changelog?.histories?.map((history) =>
      history.items?.map((item) => {
        switch (item.field) {
          case "description":
            return `altered ${item.field}`
          default:
            return `altered ${item.field} to ${item.toString}`
        }
      }).join("; ")
    ).join("; ") || "",
    "Transitions": issue.transitions?.map((t) => `transitioned to ${t.name}`).join("; ") || "",
    "Transitions Count": issue.changelog?.histories?.length.toString() || "",
    "fields.description": description || "",
  }
  for (const el of permanentlyIgnoredHeaders) {
    delete (issueRow as Record<string, string>)[el]
  }
  return issueRow
}

export function jiraSearchDataHeaders(opts: Partial<{
  fieldKeys: Array<string>
  excludeHeaders?: Array<string | RegExp>
  headersOrder?: Array<string | RegExp>
  includeHeaders?: Array<string | RegExp>
}> = {}): Array<string> {
  const fieldKeys = opts.fieldKeys || [] as Array<string>
  const excludeHeaders = opts.excludeHeaders || [] as Array<string | RegExp>
  const headerOrder = opts.headersOrder || [] as Array<string | RegExp>
  const includeHeaders = opts.includeHeaders || [] as Array<string | RegExp>

  const allHeaders = arraySubtract(
    Array.from(new Set([...extraHeaders, ...fieldKeys.map((el) => `fields.${el}`)]).values()),
    permanentlyIgnoredHeaders,
  )

  return reorganizeHeaders(allHeaders, {
    headerOrder: headerOrder,
    ignoreHeaders: excludeHeaders,
    includeHeaders: includeHeaders,
  })
}
