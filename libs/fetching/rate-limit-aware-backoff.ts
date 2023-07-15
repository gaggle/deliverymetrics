import { calculateExponentialBackoff } from "./backoff.ts"

type BackoffOpts =
  & { attemptNumber: number }
  & ({ error: Error; response?: never } | { error?: never; response: Response })

export function rateLimitAwareBackoff(
  { attemptNumber, error, response }: BackoffOpts,
): { delay?: number; reason?: string | "rate-limited" } {
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
 * Backoff strategy that retries 202 responses
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
      minTimeout: 500,
      maxTimeout: 9000,
      randomize: true,
    })
    return { delay, reason: "202 response" }
  }
  return rateLimitAwareBackoff(opts)
}
