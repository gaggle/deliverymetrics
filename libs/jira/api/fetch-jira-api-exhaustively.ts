import { ZodType } from "zod"

import { fetchExhaustively, FetchExhaustivelyOpts } from "../../fetching/mod.ts"
import { stdFetchExhaustivelyProgressLogging } from "../../../utils/mod.ts"

import { JiraPaginationFields } from "../jira-pagination-fields-schema.ts"

export function fetchJiraApiExhaustively<Schema extends ZodType<JiraPaginationFields>>(
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
      stdFetchExhaustivelyProgressLogging(call)
      if (opts?.progress) opts.progress(call)
    },
  })
}
