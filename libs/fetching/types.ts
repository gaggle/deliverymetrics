import { EventEmitter } from "event"

import { Retrier } from "./retrier.ts"

type BackoffFnOpts<BackoffEvents extends Record<string, unknown[]>> = {
  emitter?: Pick<EventEmitter<BackoffEvents>, "emit">
  attemptNumber: number
}

/**
 * Calculate how long to back off, or return undefined if no retry should be attempted
 */
export type BackoffFn<BackoffEvents extends Record<string, unknown[]>> = (
  opts:
    | BackoffFnOpts<BackoffEvents> & { response: Response; error?: never }
    | BackoffFnOpts<BackoffEvents> & { error: Error; response?: never },
) => (number | undefined) | Promise<number | undefined>

export type RetrierEvents = {
  "fetching": [{ retry: number; retries: number; request: Parameters<typeof fetch> }]
  "fetched": [{ retry: number; retries: number; response?: Response; error?: Error }]
  "retrying": [{ retry: number; retries: number; in: number }]
  "done": [{ retry: number; retries: number; response?: Response; error?: Error }]
}

export type RateLimitAwareBackoffEvents = {
  "rate-limited": [{ retry: number; reset: string; duration: number; response: Response }]
}

export type FactoryRetriers = {
  "exponential": Retrier
  "rate-limit-exponential": Retrier<RetrierEvents & RateLimitAwareBackoffEvents>
  "simple": Retrier
}

export type ExponentialRetrier = FactoryRetriers["exponential"]
export type RateLimitExponentialRetrier = FactoryRetriers["rate-limit-exponential"]
export type SimpleRetrier = FactoryRetriers["simple"]
