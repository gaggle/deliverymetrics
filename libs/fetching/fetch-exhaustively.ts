import { z } from "zod"

import { fetchWithRetry, FetchWithRetryProgress } from "./fetch-with-retry.ts"

export type FetchExhaustivelyProgress = FetchWithRetryProgress | {
  type: "paging"
  to: Request
  pagesConsumed: number
  maxPages: number
}

export type FetchExhaustivelyOpts<Schema extends z.ZodTypeAny = z.ZodTypeAny> = Partial<{
  maxPages: number
  maxRetries: number
  paginationCallback: (opts: { request: Request; response: Response; data: z.output<Schema> }) => Request | undefined
  progress: (opts: FetchExhaustivelyProgress) => void | Promise<void>
  retryStrategy: "rate-limit-aware-backoff" | "github-backoff"
  /**
   * For test-purposes a fetch-like function can be injected. Defaults to global fetch.
   */
  _fetch: typeof fetch
}>

/**
 * Fetches `request` and yields response,
 * and as long as `paginationCallback` returns new requests then those will also be fetched and yielded
 * (up to `maxPages`)
 */
export async function* fetchExhaustively<Schema extends z.ZodTypeAny>(
  req: Request,
  schema: Schema,
  opts: FetchExhaustivelyOpts<Schema> = {},
): AsyncGenerator<{ response: Response; data: z.infer<Schema> }> {
  const progress = opts.progress || noop
  let currentRequest: Request | undefined = req
  let pagesConsumed = 1

  const maxPages = opts.maxPages === undefined ? 1000 : opts.maxPages

  do {
    const result: Awaited<ReturnType<typeof fetchWithRetry>> = await fetchWithRetry(currentRequest, {
      progress,
      retries: opts.maxRetries === undefined ? 8 : opts.maxRetries,
      schema,
      strategy: opts.retryStrategy,
      _fetch: opts._fetch,
    })
    yield result
    pagesConsumed++

    currentRequest = opts.paginationCallback
      ? opts.paginationCallback({ request: currentRequest, ...result })
      : undefined

    if (currentRequest && pagesConsumed > maxPages) {
      throw new Error(`cannot fetch more than ${maxPages} pages exhaustively`)
    }
    if (currentRequest) {
      await progress({ type: "paging", to: currentRequest, pagesConsumed, maxPages })
    }
  } while (currentRequest)
}

const noop = () => {}
