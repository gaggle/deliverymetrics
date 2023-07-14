import { debug } from "std:log"
import { ZodType } from "zod"

import { fetchExhaustively, FetchExhaustivelyOpts } from "../../fetching/fetch-exhaustively.ts"

import { PaginationFields } from "./jira-rest-api-spec.ts"

export function fetchJiraApiExhaustively<Schema extends ZodType<PaginationFields>>(
  getRequest: (startAt?: number, maxResults?: number) => Request,
  schema: Schema,
  opts: FetchExhaustivelyOpts<Schema>,
): ReturnType<typeof fetchExhaustively> {
  return fetchExhaustively(getRequest(), schema, {
    ...opts,
    paginationCallback: ({ data }) => {
      if (data.startAt === undefined || data.maxResults === undefined || data.total === undefined) return undefined
      const cursor = data.startAt + data.maxResults
      if (cursor >= data.total) return undefined
      return getRequest(cursor, data.maxResults)
    },
    progress: (call) => {
      switch (call.type) {
        case "paging":
          debug(`${call.type}: ${call.to.url} (${call.pagesConsumed}/${call.maxPages})`)
          break
        case "retrying":
          debug(`${call.type}: ${call.reason} (${call.retry}/${call.retries})`)
          break
      }
      if (opts?.progress) opts.progress(call)
    },
  })
}
