import { debug } from "std:log"

import { calculateExponentialBackoff } from "./backoff.ts"

type BackoffOpts =
  & { attemptNumber: number }
  & ({ error: Error; response?: Response } | { error?: never; response: Response })

export function rateLimitAwareBackoff(
  { attemptNumber, error, response }: BackoffOpts,
): { delay?: number; reason?: string | "rate-limited" | "unprocessable-entity" } {
  if (response?.ok) {
    return { reason: "ok response" }
  }
  const delay = calculateExponentialBackoff(attemptNumber, { factor: 4, minTimeout: 50, randomize: true })
  if (error) {
    return { delay, reason: `error: ${error.message}` }
  }
  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
    const reset = response.headers.get("x-ratelimit-reset")
    if (reset !== null) {
      const duration = Math.max(new Date(Number.parseInt(reset) * 1000).getTime() - new Date().getTime(), 0)
      return { delay: duration, reason: "rate-limited" }
    }
  }
  if (400 <= response.status && response.status < 500) {
    return { reason: `don't retry status code: ${response.status}` }
  }
  return { delay, reason: `status code: ${response.status}` }
}

/**
 * Backoff strategy that retries 202 responses, and gives up on 422 responses
 *
 * Computing repository statistics is an expensive operation,
 * so we try to return cached data whenever possible.
 * If the data hasn't been cached when you query a repository's statistics, you'll receive a 202 response;
 * a background job is also fired to start compiling these statistics.
 * You should allow the job a short time to complete, and then submit the request again.
 * If the job has completed, that request will receive a 200 response with the statistics in the response body.
 * - https://docs.github.com/en/rest/metrics/statistics?apiVersion=2022-11-28#best-practices-for-caching
 */
export function githubBackoff(opts: BackoffOpts): ReturnType<typeof rateLimitAwareBackoff> {
  if (opts.response?.status === 202) {
    const delay = calculateExponentialBackoff(opts.attemptNumber, {
      factor: 1.5,
      minTimeout: 1_000,
      maxTimeout: 240_000,
      randomize: true,
    })

    debug(
      `githubBackoff got status code ${opts.response?.status}, attempt ${opts.attemptNumber}, delaying ${delay}`,
    )
    return { delay, reason: "202 response" }
  }
  if (opts.response?.status === 422) {
    debug(
      `giving up request due to status code ${opts.response?.status} from ${opts.response.url}: ${opts.error}`,
    )
    return { delay: undefined, reason: "unprocessable-entity" }
  }
  return rateLimitAwareBackoff(opts)
}
