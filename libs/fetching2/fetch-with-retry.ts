import { z } from "zod"

import { filterUndefined, parseWithZodSchemaFromRequest, sleep } from "../utils/mod.ts"

import { githubBackoff, rateLimitAwareBackoff } from "./rate-limit-aware-backoff.ts"

export type FetchWithRetryProgress =
  | { type: "done"; retry: number; retries: number; response?: Response; error?: Error }
  | { type: "error"; retry: number; retries: number; error: Error }
  | { type: "fetched"; retry: number; retries: number; response: Response }
  | { type: "fetching"; retry: number; retries: number; request: Request }
  | { type: "retrying"; retry: number; retries: number; reason?: "rate-limited" | string }

export type BaseOpts = {
  /**
   * For test-purposes a fetch-like function can be injected. Defaults to global fetch.
   */
  _fetch?: typeof fetch
  /**
   * Number of retries to attempt, defaults to 5
   */
  retries?: number
  strategy?: "rate-limit-aware-backoff" | "github-backoff"
  progress?: (
    opts: FetchWithRetryProgress,
  ) => void | Promise<void>
}
export type OptsSchemaless = BaseOpts & { schema?: undefined }
export type OptsSchema<T extends z.ZodTypeAny> = BaseOpts & { schema: T }
export type FetchWithRetryOpts = OptsSchemaless | OptsSchema<z.ZodTypeAny>

const noop = () => {}

export async function fetchWithRetry(
  req: Request,
  opts?: OptsSchemaless,
): Promise<{ response: Response; data: unknown }>
export async function fetchWithRetry<Schema extends z.ZodTypeAny>(
  req: Request,
  opts: OptsSchema<Schema>,
): Promise<{ response: Response; data: z.infer<Schema> }>
export async function fetchWithRetry(
  request: Request,
  opts: FetchWithRetryOpts = {},
): Promise<{ response: Response; data: unknown }> {
  const {
    _fetch,
    progress,
    retries,
    schema,
  } = {
    _fetch: fetch,
    progress: noop,
    retries: 3,
    schema: undefined,
    ...filterUndefined(opts),
  }

  let backoffFn: typeof rateLimitAwareBackoff
  switch (opts.strategy) {
    case "github-backoff":
      backoffFn = githubBackoff
      break
    default:
      backoffFn = rateLimitAwareBackoff
  }

  const isAttemptLimitReached = () => attemptNumber >= retries

  const processResponse = async (response: Response, data: unknown): Promise<void> => {
    const { delay: backoffDelay, reason } = backoffFn({
      attemptNumber,
      response,
    })
    if (backoffDelay === undefined || isAttemptLimitReached()) {
      await progress({ type: "done", retry: attemptNumber, retries, response })
      returnResponse = { response, data }
      return
    }

    await progress({ type: "retrying", retry: attemptNumber, retries, reason })
    await sleep(backoffDelay)
  }

  const processError = async (error: Error): Promise<void> => {
    const { delay: backoffDelay, reason } = backoffFn({
      attemptNumber,
      error,
    })
    if (backoffDelay === undefined || isAttemptLimitReached()) {
      await progress({ type: "done", retry: attemptNumber, retries, error })
      throw error
    }
    await progress({ type: "retrying", retry: attemptNumber, retries, reason })
    await sleep(backoffDelay)
  }

  let returnResponse: { data: unknown; response: Response } | undefined = undefined
  let attemptNumber = -1
  while (!returnResponse) {
    try {
      attemptNumber++
      await progress({ type: "fetching", retry: attemptNumber, retries, request })
      const response = await _fetch(request)

      const isJson = response.headers.get("Content-Type")?.includes("application/json") || false
      let data: unknown
      if (isJson) {
        data = await response.clone().json()
      } else {
        data = await response.clone().text()
      }
      if (schema) {
        parseWithZodSchemaFromRequest({ data, schema, request, response })
      }
      await progress({ type: "fetched", retry: attemptNumber, retries, response })
      await processResponse(response, data)
    } catch (error) {
      await progress({ type: "error", retry: attemptNumber, retries, error })
      await processError(error)
    }
  }
  return returnResponse
}
