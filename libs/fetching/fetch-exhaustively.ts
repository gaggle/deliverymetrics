import { z } from "zod"

import { fetchWithRetry, FetchWithRetryProgress } from "./fetch-with-retry.ts"

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

export type FetchExhaustivelyProgress = FetchWithRetryProgress | {
  type: "paging"
  to: Request
  pagesConsumed: number
  maxPages: number
}

/**
 * Fetches `request` and yields response,
 * and if response has a `Link.next` header
 * then continue to yield those (up to `maxPages`)
 */
export async function* fetchExhaustively<Schema extends z.ZodTypeAny>(
  req: Request,
  schema: Schema,
  opts: Partial<{
    maxPages: number
    maxRetries: number
    retryStrategy: "rate-limit-aware-backoff" | "github-backoff"
    progress: (opts: FetchExhaustivelyProgress) => void | Promise<void>
    /**
     * For test-purposes a fetch-like function can be injected. Defaults to global fetch.
     */
    _fetch: typeof fetch
  }> = {},
): AsyncGenerator<{ response: Response; data: z.infer<Schema> }> {
  const progress = opts.progress || noop
  let currentRequest: Request | undefined = req
  let pagesConsumed = 1

  const maxPages = opts.maxPages === undefined ? 1000 : opts.maxPages

  do {
    const result = await fetchWithRetry(currentRequest, {
      progress,
      retries: opts.maxRetries || 8,
      schema,
      strategy: opts.retryStrategy,
      _fetch: opts._fetch,
    })
    yield result
    pagesConsumed++
    currentRequest = getNextRequestFromLinkHeader(currentRequest, result.response)
    if (currentRequest) {
      await progress({ type: "paging", to: currentRequest, pagesConsumed, maxPages })
    }
    if (currentRequest && pagesConsumed > maxPages) {
      throw new Error(`cannot fetch more than ${maxPages} pages exhaustively`)
    }
  } while (currentRequest)
}

const noop = () => {}
