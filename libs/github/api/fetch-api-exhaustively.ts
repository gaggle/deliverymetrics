import { debug } from "std:log"

import { fetchExhaustively } from "../../fetching/fetch-exhaustively.ts"

type FetchExhaustivelyLike = (...args: Parameters<typeof fetchExhaustively>) => ReturnType<typeof fetchExhaustively>

export const fetchAPIExhaustively: FetchExhaustivelyLike = (req, schema, opts) => {
  return fetchExhaustively(req, schema, {
    ...opts,
    paginationCallback: (opts) => getNextRequestFromLinkHeader(opts.request, opts.response),
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

function getNextRequestFromLinkHeader(req: Request, resp: Response): Request | undefined {
  const link = parseLink(resp.headers.get("Link") || "")

  let newReq: Request | undefined = undefined

  if (link.next) {
    newReq = new Request(link.next, req)
  }
  return newReq
}

/**
 * Copied from https://github.com/SamVerschueren/github-parse-link/blob/master/index.js
 */
function parseLink(link: string): Record<string, string> {
  return link.split(", ").reduce(function (acc, curr) {
    const match = curr.match('<(.*?)>; rel="(.*?)"')

    if (match && match.length === 3) {
      acc[match[2]] = match[1]
    }

    return acc
  }, {} as Record<string, string>)
}
