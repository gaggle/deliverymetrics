import { FetchExhaustivelyProgress } from "./fetch-exhaustively.ts"
import { debug } from "std:log"

export function stdFetchExhaustivelyProgressLogging(call: FetchExhaustivelyProgress): void {
  switch (call.type) {
    case "paging":
      debug(`${call.type}: ${call.to.url} (${call.pagesConsumed}/${call.maxPages})`)
      break
    case "retrying":
      debug(`${call.type} in ${(call.delay / 1000).toFixed(2)}s: ${call.reason} (${call.retry}/${call.retries})`)
      break
  }
}
