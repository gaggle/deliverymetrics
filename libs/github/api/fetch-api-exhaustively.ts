import { debug } from "std:log"

import { fetchExhaustively } from "../../fetching/fetch-exhaustively.ts"

type FetchExhaustivelyLike = (...args: Parameters<typeof fetchExhaustively>) => ReturnType<typeof fetchExhaustively>

export const fetchAPIExhaustively: FetchExhaustivelyLike = (req, schema, opts) => {
  return fetchExhaustively(req, schema, {
    ...opts,
    progress: (call) => {
      switch (call.type) {
        case "paging":
          debug(`${call.type} (${call.pagesConsumed}/${call.maxPages})`)
          break
        case "retrying":
          debug(`${call.type}: ${call.reason} (${call.retry}/${call.retries})`)
          break
      }
      if (opts?.progress) opts.progress(call)
    },
  })
}
