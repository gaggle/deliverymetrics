import { debug } from "std:log"
import { z } from "zod"

import { AbortError, FetchError, filterUndefined, parseWithZodSchemaFromRequest, sleep } from "../../utils/mod.ts"

import { githubBackoff, rateLimitAwareBackoff } from "./rate-limit-aware-backoff.ts"

export type FetchWithRetryProgress =
  | { type: "done"; retry: number; retries: number; response?: Response; error?: Error }
  | { type: "error"; retry: number; retries: number; error: Error }
  | { type: "fetched"; retry: number; retries: number; response: Response }
  | { type: "fetching"; retry: number; retries: number; request: Request }
  | { type: "retrying"; retry: number; retries: number; reason?: "rate-limited" | string; delay: number }

export type BaseOpts = {
  /**
   * For test-purposes a fetch-like function can be injected. Defaults to global fetch.
   */
  _fetch?: typeof fetch
  progress?: (opts: FetchWithRetryProgress) => void | Promise<void>
  /**
   * Number of retries to attempt, defaults to 5
   */
  retries?: number
  signal?: AbortSignal
  strategy?: "rate-limit-aware-backoff" | "github-backoff"
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
    signal,
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
    debug(`processing response from ${response.url}`)
    const { delay: backoffDelay, reason } = backoffFn({
      attemptNumber,
      response,
    })
    debug(`backoff function from response returned '${backoffDelay}' delay with reason: ${reason}`)
    if (backoffDelay === undefined || isAttemptLimitReached()) {
      await progress({ type: "done", retry: attemptNumber, retries, response })
      returnResponse = { response, data }
      debug(`returning ${returnResponse.response.url}`)
      return
    }

    await progress({ type: "retrying", retry: attemptNumber, retries, reason, delay: backoffDelay })
    await sleep(backoffDelay, { signal })
    if (signal?.aborted) {
      throw new AbortError()
    }
  }

  const processError = async (error: Error, response?: Response): Promise<void> => {
    debug(response ? `processing error from ${response.url}: ${error}` : `processing error: ${error}`)
    const { delay: backoffDelay, reason } = backoffFn({
      attemptNumber,
      error,
      response,
    })
    debug(`backoff function from error returned '${backoffDelay}' delay with reason: ${reason}`)
    if (backoffDelay === undefined || isAttemptLimitReached()) {
      await progress({ type: "done", retry: attemptNumber, retries, error })
      throw error
    }
    await progress({ type: "retrying", retry: attemptNumber, retries, reason, delay: backoffDelay })
    await sleep(backoffDelay, { signal })
    if (signal?.aborted) {
      throw new AbortError()
    }
  }

  let returnResponse: { data: unknown; response: Response } | undefined = undefined
  let attemptNumber = -1
  let response: Response | undefined
  while (!returnResponse) {
    try {
      attemptNumber++
      await progress({ type: "fetching", retry: attemptNumber, retries, request })
      const requestBody = await request.clone().text()
      debug(`fetching ${request.url} (attempt ${attemptNumber})`)
      response = await _fetch(request, { signal })

      const isJson = response.headers.get("Content-Type")?.includes("application/json") || false
      let data: unknown
      if (isJson) {
        data = await response.clone().json()
        debug(`${request.url} is JSON`)
      } else {
        data = await response.clone().text()
        debug(`${request.url} is not JSON`)
      }
      if (schema) {
        parseWithZodSchemaFromRequest({ data, schema, request, requestBody, response })
        debug(`${request.url} passes schema validation`)
      }
      await progress({ type: "fetched", retry: attemptNumber, retries, response })
      await processResponse(response, data)
    } catch (error) {
      debug(`error during request: ${error}`)
      await progress({ type: "error", retry: attemptNumber, retries, error })
      if (signal?.aborted) {
        throw new AbortError(error)
      }
      await processError(error, response)
    }
  }
  return returnResponse
}
