/**
 * Return delay in ms
 */
export function calculateExponentialBackoff(attempt: number, opts: {
  /** The exponential factor to use. Default is `2`. */
  factor?: number
  /** The number of milliseconds before starting the first retry. Default is `1000`. */
  minTimeout?: number
  /** The maximum number of milliseconds between two retries. Default is `Infinity`. */
  maxTimeout?: number
  /** Randomizes the timeouts by multiplying with a factor between `1` to `2`. Default is `false`. */
  randomize?: boolean
} = {}): number {
  const options = {
    factor: 2,
    minTimeout: 1000,
    maxTimeout: Infinity,
    randomize: false,
    ...opts,
  }

  const random = options.randomize ? Math.random() + 1 : 1

  const timeout = Math.round(
    random * Math.max(options.minTimeout, 1) *
      Math.pow(options.factor, attempt),
  )

  return Math.min(timeout, options.maxTimeout)
}
