import { JiraSearchIssue, JiraSearchNames } from "../jira/api/search/mod.ts"

import { JiraSyncInfo, ReadonlyJiraClient } from "../jira/mod.ts"
import { arrayToAsyncGenerator, daysBetween, flattenObject } from "../utils/mod.ts"

import { AbortError } from "../errors.ts"

export interface GetJiraSearchDataYielderReturnType {
  fieldKeys: Array<string>
  fieldKeysToNames: JiraSearchNames
  yieldJiraSearchIssues: AsyncGenerator<JiraSearchIssue>
}

export async function getJiraSearchDataYielder(
  client: ReadonlyJiraClient,
  opts: Partial<{ includeStatuses: Array<string>; includeTypes:Array<string>; maxDays: number; signal: AbortSignal }> = {},
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
  opts: Partial<{ includeStatuses: Array<string>; includeTypes:Array<string>; maxDays: number; signal: AbortSignal }>,
): AsyncGenerator<JiraSearchIssue> {
  for await (const { issue } of client.findSearchIssues()) {
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
