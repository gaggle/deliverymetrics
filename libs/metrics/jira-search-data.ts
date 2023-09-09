import { warning } from "std:log"

import {
  AbortError,
  arrayToAsyncGenerator,
  assertUnreachable,
  asyncToArray,
  daysBetween,
  flattenObject,
  getValueByPath,
} from "../../utils/mod.ts"

import { JiraSearchIssue } from "../jira/api/search/mod.ts"
import { JiraSyncInfo, ReadonlyJiraClient } from "../jira/mod.ts"

export interface GetJiraSearchDataYielderReturnType {
  fieldKeys: Array<string>
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
    excludeUnusedFields: boolean
  }> = {},
): Promise<GetJiraSearchDataYielderReturnType> {
  const latestSync = await client.findLatestSync({ type: "search" })
  if (!latestSync) return { fieldKeys: [], yieldJiraSearchIssues: arrayToAsyncGenerator([]) }

  const [fieldKeys, yieldJiraSearchIssues] = await Promise.all([
    getAllFieldKeys(client, {
      ...opts,
      discardEmptyStrings: opts.excludeUnusedFields,
      discardNulls: opts.excludeUnusedFields,
    }),
    yieldJiraSearchData(client, latestSync, opts),
  ])

  return { fieldKeys, yieldJiraSearchIssues }
}

async function getAllFieldKeys(
  client: ReadonlyJiraClient,
  { discardEmptyStrings, discardNulls, signal }: Partial<{
    discardEmptyStrings: boolean
    discardNulls: boolean
    signal: AbortSignal
  }>,
): Promise<Array<string>> {
  const headers = new Set<string>()
  for await (const { issue, namesHash } of client.findSearchIssues()) {
    if (signal?.aborted) throw new AbortError()

    const fieldKeysToNames = namesHash ? await getFieldTranslationsByHash(client, namesHash) : {}

    const translatedFields = fieldKeysToNames
      ? Object.fromEntries(
        Object.entries(issue.fields || {})
          .map(([key, val]) => [fieldKeysToNames[key] || key, val]),
      )
      : issue.fields

    for (const [key, val] of Object.entries(flattenObject(translatedFields || {}))) {
      if (discardEmptyStrings && val === "") continue
      if (discardNulls && val === null) continue
      headers.add(key)
    }
  }
  return Array.from(headers)
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
  const sortBy = opts.sortBy
  const dbIssues = sortBy
    ? arrayToAsyncGenerator((await asyncToArray(client.findSearchIssues())).sort((a, b) => {
      const aVal = getValueByPath(a.issue, sortBy.key)
      const bVal = getValueByPath(b.issue, sortBy.key)

      switch (sortBy.type) {
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
        default:
          assertUnreachable(sortBy.type)
      }
    }))
    : client.findSearchIssues()

  for await (const { issue, namesHash } of dbIssues) {
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

    const fieldKeysToNames = namesHash ? await getFieldTranslationsByHash(client, namesHash) : {}

    yield {
      ...issue,
      fields: Object.fromEntries(
        Object.entries(issue.fields || {})
          .map(([key, val]) => [fieldKeysToNames[key] || key, val]),
      ),
    }
  }
}

async function getFieldTranslationsByHash(client: ReadonlyJiraClient, hash: string): Promise<Record<string, string>> {
  const item = await client.findSearchNameByHash(hash)
  if (!item) throw new Error(`No search name by hash: ${hash}`)

  const translationByFieldsKey: Record<string, string> = {}
  for (const [key, label] of Object.entries(item.names)) {
    const translation = getTranslationFromKeyAndLabel(key, label)
    if (translationByFieldsKey[key]) {
      warning(`Overwriting translation key '${key}': ${translationByFieldsKey[key]} -> ${translation}`)
    }
    translationByFieldsKey[key] = translation
  }
  return translationByFieldsKey
}

function getTranslationFromKeyAndLabel(key: string, label: string): string {
  const keyMatch = key.toLowerCase()
  const labelMatch = label.toLowerCase().replaceAll(" ", "").replaceAll("-", "")
  return keyMatch === labelMatch ? label : `${label} (${key})`
}

function newEpochMaybe(value: string | undefined | null): number | undefined {
  if (value === undefined || value === null) return undefined
  const date = new Date(value)
  return isValidDate(date) ? date.getTime() : undefined
}

function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.valueOf())
}
