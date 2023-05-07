import { EventEmitter } from "event"

import { sleep } from "../utils/mod.ts"

import { BackoffFn, RetrierEvents } from "./types.ts"

export class Retrier<Events extends RetrierEvents = RetrierEvents> extends EventEmitter<Events> {
  private readonly _fetch: typeof fetch
  private readonly retries: number

  constructor(private readonly backoffFn: BackoffFn<Events>, opts: Partial<{
    retries: number
    /**
     * For test-purposes a fetch-like function can be injected. Defaults to global fetch.
     */
    _fetch: typeof fetch
  }> = {}) {
    super()
    this._fetch = opts._fetch || globalThis.fetch
    this.retries = opts.retries !== undefined ? opts.retries : 3
  }

  async fetch(...args: Parameters<typeof fetch>): ReturnType<typeof fetch> {
    const attemptLimitReached = () => attemptNumber >= this.retries

    const handleRetry = async (opts: { response: Response; error?: never } | { error: Error; response?: never }) => {
      const backoffDelay = await this.backoffFn({
        emitter: { emit: this.emit.bind(this) },
        attemptNumber,
        ...opts.response ? { response: opts.response } : { error: opts.error },
      })
      if (backoffDelay === undefined || attemptLimitReached()) {
        const donePayload: { retry: number; retries: number; response?: Response; error?: Error } = {
          retry: attemptNumber,
          retries: this.retries,
        }
        if (opts.response) {
          donePayload["response"] = opts.response
        }
        if (opts.error) {
          donePayload["error"] = opts.error
        }
        await this.emit("done", donePayload)

        if (opts.response) {
          returnResponse = opts.response
          return
        } else throw opts.error
      }

      await this.emit("retrying", { retry: attemptNumber, retries: this.retries, in: backoffDelay })
      await sleep(backoffDelay)
    }

    let returnResponse: Response | undefined = undefined
    let attemptNumber = -1
    while (!returnResponse) {
      try {
        attemptNumber++
        await this.emit("fetching", { retry: attemptNumber, retries: this.retries, request: args })
        const response = await this._fetch(...args)
        await this.emit("fetched", { retry: attemptNumber, retries: this.retries, response })

        await handleRetry({ response })
      } catch (error) {
        await this.emit("fetched", { retry: attemptNumber, retries: this.retries, error })
        await handleRetry({ error })
      }
    }
    return returnResponse
  }
}
