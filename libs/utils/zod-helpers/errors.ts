import { getLogger } from "std:log"
import { z } from "zod"

import { stringifyZodError } from "./stringify-zod-error.ts"

export class EnrichedZodError extends z.ZodError {
  readonly #data?: unknown

  constructor(issues: z.ZodIssue[], opts: { data?: unknown } = {}) {
    super(issues)
    this.name = "EnrichedZodError"
    this.#data = opts.data
  }

  get message() {
    let msg = stringifyZodError(this.issues)
    if (getLogger().level <= 10) {
      msg += `, data: ${JSON.stringify(this.#data, null, 2)}`
    }
    return msg
  }
}
