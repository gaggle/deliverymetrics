import { BackoffFn, RateLimitAwareBackoffEvents } from "./types.ts"
import { calculateExponentialBackoff } from "./backoff.ts"

type Empty = Record<string | number | symbol, never>

export const simpleBackoff: BackoffFn<Empty> = ({ error, response }) => {
  if (response?.ok) return
  if (error) return 0
  if (400 <= response.status && response.status < 500) {
    // Don't retry client errors
    return
  }
  return 0
}

export const exponentialBackoff: BackoffFn<Empty> = ({ attemptNumber, error, response }) => {
  if (response?.ok) return
  const delay = calculateExponentialBackoff(attemptNumber, { factor: 4, minTimeout: 50, randomize: true })
  if (error) return delay
  if (400 <= response.status && response.status < 500) {
    // Don't retry client errors
    return
  }
  return delay
}

export const rateLimitAwareBackoff: BackoffFn<RateLimitAwareBackoffEvents> = async (
  { attemptNumber, error, response, emitter },
) => {
  if (response?.ok && response.status !== 202) return
  const delay = calculateExponentialBackoff(attemptNumber, { factor: 4, minTimeout: 50, randomize: true })
  if (error) return delay
  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
    const reset = response.headers.get("x-ratelimit-reset")
    if (reset !== null) {
      const duration = Math.max(new Date(Number.parseInt(reset) * 1000).getTime() - new Date().getTime(), 0)
      await emitter?.emit("rate-limited", { retry: attemptNumber, reset, duration, response })
      return duration
    }
  }
  if (400 <= response.status && response.status < 500) {
    // Don't retry client errors
    return
  }
  return delay
}
