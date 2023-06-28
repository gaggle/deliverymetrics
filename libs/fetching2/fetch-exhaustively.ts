import { z } from "zod"

import { BaseOpts, fetchWithRetry } from "./fetch-with-retry.ts"

/**
 * Copied from https://github.com/SamVerschueren/github-parse-link/blob/master/index.js
 */
export function parseLink(link: string): Record<string, string> {
  return link.split(", ").reduce(function (acc, curr) {
    const match = curr.match('<(.*?)>; rel="(.*?)"')

    if (match && match.length === 3) {
      acc[match[2]] = match[1]
    }

    return acc
  }, {} as Record<string, string>)
}

export function getNextRequestFromLinkHeader(req: Request, resp: Response): Request | undefined {
  const link = parseLink(resp.headers.get("Link") || "")

  let newReq: Request | undefined = undefined

  if (link.next) {
    newReq = new Request(link.next, req)
  }
  return newReq
}

/**
 * Fetches `request` and yields response,
 * and if response has a `Link.next` header
 * then continue to yield those (up to `maxPages`)
 */
export async function* fetchExhaustively2<Schema extends z.ZodTypeAny>(
  req: Request,
  schema: Schema,
  opts: BaseOpts = {},
): AsyncGenerator<{ response: Response; data: z.infer<Schema> }> {
  let currentRequest: Request | undefined = req
  let pagesConsumed = 1

  const maxPages = 1000

  do {
    const result = await fetchWithRetry(currentRequest, { retries: 6, ...opts, schema })
    yield result
    currentRequest = getNextRequestFromLinkHeader(currentRequest, result.response)
    if (currentRequest && pagesConsumed > maxPages) {
      throw new Error(`cannot fetch more than ${maxPages} pages exhaustively`)
    }
    pagesConsumed++
  } while (currentRequest)
}
