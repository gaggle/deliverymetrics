import { JiraSearchIssue, JiraSearchNames } from "../jira/api/search/mod.ts"

import { JiraSyncInfo, ReadonlyJiraClient } from "../jira/mod.ts"
import { arrayToAsyncGenerator, asyncToArray, daysBetween, flattenObject } from "../../utils/mod.ts"

import { AbortError } from "../../utils/errors.ts"

export interface GetJiraSearchDataYielderReturnType {
  fieldKeys: Array<string>
  fieldKeysToNames: JiraSearchNames
  yieldJiraSearchIssues: AsyncGenerator<JiraSearchIssue>
}

export async function getJiraSearchDataYielder(
  client: ReadonlyJiraClient,
  opts: Partial<{
    includeStatuses: Array<string>
    includeTypes: Array<string>
    maxDays: number
    signal: AbortSignal
    sortBy: { key: string; type: "date" }
  }> = {},
): Promise<GetJiraSearchDataYielderReturnType> {
  const latestSync = await client.findLatestSync({ type: "search" })
  if (!latestSync) return { fieldKeys: [], fieldKeysToNames: {}, yieldJiraSearchIssues: arrayToAsyncGenerator([]) }

  const [fieldKeys, fieldKeysToNames] = await Promise.all([
    getAllFieldKeys(client, opts),
    getAllFieldKeysToNames(client, opts),
  ])
  return {
    fieldKeys,
    fieldKeysToNames,
    yieldJiraSearchIssues: yieldJiraSearchData(client, latestSync, opts),
  }
}

async function getAllFieldKeys(
  client: ReadonlyJiraClient,
  opts: Partial<{ signal: AbortSignal }>,
): Promise<Array<string>> {
  const headers = new Set<string>()
  for await (const { issue } of client.findSearchIssues()) {
    if (opts.signal?.aborted) throw new AbortError()

    for (const el of Object.keys(flattenObject(issue))) {
      if (el.startsWith("fields.")) {
        headers.add(el)
      }
    }
  }
  return Array.from(headers)
}

async function getAllFieldKeysToNames(
  client: ReadonlyJiraClient,
  opts: Partial<{ signal: AbortSignal }>,
): Promise<Record<string, string>> {
  const allNames: Record<string, string> = {}
  for await (const { names } of client.findSearchNames()) {
    if (opts.signal?.aborted) {
      throw new AbortError()
    }

    for (const [key, value] of Object.entries(names)) {
      allNames[key] = value
    }
  }
  return allNames
}

async function* yieldJiraSearchData(
  client: ReadonlyJiraClient,
  latestSync: JiraSyncInfo,
  opts: Partial<{
    includeStatuses: Array<string>
    includeTypes: Array<string>
    maxDays: number
    signal: AbortSignal
    sortBy: { key: string; type: "date" }
  }>,
): AsyncGenerator<JiraSearchIssue> {
  const issues = opts.sortBy
    ? arrayToAsyncGenerator((await asyncToArray(client.findSearchIssues())).sort((a, b) => {
      const aVal = a.issue?.fields?.[opts.sortBy!.key]
      const bVal = b.issue?.fields?.[opts.sortBy!.key]

      switch (opts.sortBy!.type) {
        case "date": {
          const aT = newEpochMaybe(aVal)
          const bT = newEpochMaybe(bVal)
          if (aT === undefined && bT === undefined) return 0
          if (aT === undefined) return 1
          else if (bT === undefined) return -1
          if (aT < bT) return -1
          if (aT > bT) return 1
          return 0
        }
      }
    }))
    : client.findSearchIssues()

  for await (const { issue } of issues) {
    if (opts.signal?.aborted) {
      throw new AbortError()
    }

    if (opts.includeStatuses) {
      if (issue.fields?.status?.name) {
        if (!opts.includeStatuses.includes(issue.fields?.status?.name)) {
          continue
        }
      } else {
        continue
      }
    }

    if (opts.includeTypes) {
      if (issue.fields?.issuetype?.name) {
        if (!opts.includeTypes?.includes(issue.fields?.issuetype?.name)) {
          continue
        }
      } else {
        continue
      }
    }

    if (
      issue.fields?.updated &&
      daysBetween(new Date(issue.fields.updated), new Date(latestSync.updatedAt!)) > (opts.maxDays || Infinity)
    ) {
      return false
    }

    yield issue
  }
}

function newEpochMaybe(value: string | undefined | null): number | undefined {
  if (value === undefined || value === null) return undefined
  const date = new Date(value)
  return isValidDate(date) ? date.getTime() : undefined
}

function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.valueOf())
}
