import { jiraSearchIssueSchema } from "../../libs/jira/api/search/mod.ts"

import { GetJiraSearchDataYielderReturnType } from "../../libs/metrics/mod.ts"
import { arraySubtract, extractZodSchemaKeys, flattenObject, stringifyObject } from "../../libs/utils/mod.ts"

const ignoreHeaders = ["changelog.histories", "transitions"]
const extraHeaders = ["Changelog Histories", "Transitions", "Transitions Count"] as const
const fixedHeaders = [
  ...extraHeaders,
  ...Object.keys(flattenObject(extractZodSchemaKeys(jiraSearchIssueSchema))).sort(),
]

export async function* jiraSearchDataIssuesAsCsv(
  iter: GetJiraSearchDataYielderReturnType["yieldJiraSearchIssues"],
  opts: Partial<{ maxDescriptionLength: number }> = {},
): AsyncGenerator<Record<typeof extraHeaders[number] | string, string>> {
  for await (const issue of iter) {
    let description = issue.fields?.description
    if (description && opts.maxDescriptionLength !== undefined) {
      const str = description.slice(0, opts.maxDescriptionLength)
      const remaining = description.slice(opts.maxDescriptionLength).length
      description = `${str}... ${remaining} more characters`
    }
    yield {
      ...stringifyObject(flattenObject(issue), { stringifyUndefined: true }),
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
  }
}

export function jiraSearchDataHeaders(opts: Partial<{
  fieldKeys: Array<string>
  fieldKeysToNames: Record<string, string>
}> = {}): Array<string> {
  const fieldKeys = opts.fieldKeys || []
  return arraySubtract(Array.from(new Set([...fixedHeaders, ...fieldKeys]).values()), ignoreHeaders)
}
