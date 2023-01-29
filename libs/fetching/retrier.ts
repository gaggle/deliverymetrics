type RetryFn = (
  opts:
    | { response: Response; error?: never; attemptNumber: number }
    | { error: Error; response?: never; attemptNumber: number },
) => boolean | Promise<boolean>

export class Retrier {
  private readonly _fetch: typeof fetch
  private readonly maxRetries: number
  private readonly shouldRetry: RetryFn

  constructor(opts: {
    fetch?: typeof fetch
    maxRetries?: number
    shouldRetry?: RetryFn
  } = {}) {
    this._fetch = opts.fetch || globalThis.fetch
    this.maxRetries = opts.maxRetries || 3
    this.shouldRetry = opts.shouldRetry ||
      (({ response, error }) => !!(!response?.ok || error))
  }

  async fetch(...args: Parameters<typeof fetch>): ReturnType<typeof fetch> {
    const attemptLimitReached = () => {
      return attemptNumber > this.maxRetries
    }

    let attemptNumber = 0
    while (!attemptLimitReached()) {
      try {
        const response = await this._fetch(...args)
        const shouldRetry = await this.shouldRetry({ attemptNumber, response })
        attemptNumber++
        if (!shouldRetry || attemptLimitReached()) {
          return response
        }
      } catch (error) {
        const shouldRetry = await this.shouldRetry({ attemptNumber, error })
        attemptNumber++
        if (!shouldRetry || attemptLimitReached()) {
          throw error
        }
      }
    }
    throw new Error("Error guard")
    // ↑ This can't happen but is needed to make Typescript happy
  }
}
