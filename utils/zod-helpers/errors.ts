import { z } from "zod"

import { toCurlCommand } from "../mod.ts"

import { stringifyZodError } from "./stringify-zod-error.ts"

export class EnrichedZodError extends z.ZodError {
  readonly #data?: string
  readonly #request?: Request
  readonly #requestBody?: string
  readonly #response?: Response

  constructor(issues: z.ZodIssue[], opts: {
    data?: string | unknown
    request?: Request
    requestBody?: string
    response?: Response
  } = {}) {
    super(issues)
    this.name = "EnrichedZodError"
    this.#data = typeof opts.data === "string" ? opts.data : JSON.stringify(opts.data, null, 2)
    this.#request = opts.request
    this.#requestBody = opts.requestBody
    this.#response = opts.response
  }

  get message() {
    let msg = stringifyZodError(this.issues)

    if (this.#request) {
      msg += `\n  ↳ request: ${toCurlCommand(this.#request, this.#requestBody)}`
    }

    if (this.#response) {
      msg += `\n  ↳ response: ${this.#response.status} ${this.#response.statusText}`
    }

    // if (isDebugLoggingActive()) {
    //   msg += `\n  ↳ data: ${this.#data}`
    // }

    return msg
  }
}
