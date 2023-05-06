import { z } from "zod"

import { stringifyZodError } from "./stringify-zod-error.ts"

export class EnrichedZodError extends z.ZodError {
  constructor(issues: z.ZodIssue[]) {
    super(issues)
    this.name = "EnrichedZodError"
  }

  get message() {
    return stringifyZodError(this.issues)
  }
}
