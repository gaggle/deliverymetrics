import { GetJiraSearchDataYielderReturnType } from "../../libs/metrics/mod.ts"

import { arraySubtract, flattenObject, regexOrStringTestMany, stringifyObject } from "../../utils/mod.ts"

export const ignoreHeaders = ["changelog.histories", "transitions"]
const extraHeaders = ["Changelog Histories", "Transitions", "Transitions Count"] as const

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
    const issueRow = {
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
    for (const el of ignoreHeaders) {
      delete (issueRow as Record<string, string>)[el]
    }
    yield issueRow
  }
}

export function jiraSearchDataHeaders(opts: Partial<{
  fieldKeys: Array<string>
  fieldsToExclude: Array<string | RegExp>
  fieldsToInclude: Array<string | RegExp>
}> = {}): Array<string> {
  const fieldKeys = opts.fieldKeys || []
  const fieldsToInclude = opts.fieldsToInclude || []
  const fieldsToExclude = opts.fieldsToExclude || []

  const allHeaders = arraySubtract(
    Array.from(new Set([...extraHeaders, ...fieldKeys.map((el) => `fields.${el}`)]).values()),
    ignoreHeaders,
  )

  return allHeaders.filter((el) => {
    if (regexOrStringTestMany(el, fieldsToInclude)) return true
    if (regexOrStringTestMany(el, fieldsToExclude)) return false
    return true
  })
}
