import { assertUnreachable } from "../utils/mod.ts"

import { exponentialBackoff, rateLimitAwareBackoff, simpleBackoff } from "./retrier-backoff-functions.ts"
import {
  ExponentialRetrier,
  FactoryRetriers,
  RateLimitAwareBackoffEvents,
  RateLimitExponentialRetrier,
  RetrierEvents,
  SimpleRetrier,
} from "./types.ts"
import { Retrier } from "./retrier.ts"

type FactoryBaseOpts = {
  /**
   * Number of retries to attempt, defaults to 5
   */
  retries?: number
}

type RetrierFactoryOpts = FactoryBaseOpts & {
  /**
   * * `exponential`: classic exponential backoff w. jitter for all errors & responses that aren't 2xx or 4xx.
   *                  Backoff curve is roughly: 50, 200, 800, 3200, 12800
   * * `simple`: Flat small delay on errors & responses that aren't 2xx or 4xx. Intended for debugging.
   */
  strategy?: "exponential" | "simple"
  // ↑ optional because the default case is "exponential"
}

type RetrierFactoryRateLimitExponentialOpts = FactoryBaseOpts & {
  /**
   * * `rate-limit-exponential`: Like `exponential` but also backs off if rate-limiting headers
   *                             (`x-ratelimit-remaining`, `x-ratelimit-reset`) specifies a time until reset
   */
  strategy: "rate-limit-exponential"
}

export function retrierFactory(opts?: RetrierFactoryOpts): FactoryRetriers["exponential"] | FactoryRetriers["simple"]
export function retrierFactory(opts: RetrierFactoryRateLimitExponentialOpts): FactoryRetriers["rate-limit-exponential"]
export function retrierFactory(
  { retries, strategy }: RetrierFactoryOpts | RetrierFactoryRateLimitExponentialOpts = {},
): FactoryRetriers[keyof FactoryRetriers] {
  switch (strategy) {
    case undefined:
    case "exponential": {
      const exponentialRetrier: ExponentialRetrier = new Retrier(exponentialBackoff, { retries: retries || 5 })
      return exponentialRetrier
    }
    case "rate-limit-exponential": {
      const rateLimitExponentialRetrier: RateLimitExponentialRetrier = new Retrier<
        RetrierEvents & RateLimitAwareBackoffEvents
      >(
        rateLimitAwareBackoff,
        {
          retries: retries || 5,
        },
      )
      return rateLimitExponentialRetrier
    }
    case "simple": {
      const simpleRetrier: SimpleRetrier = new Retrier(simpleBackoff, { retries: retries || 5 })
      return simpleRetrier
    }
    default: {
      assertUnreachable(strategy)
    }
  }
}
