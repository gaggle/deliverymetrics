import { z } from "zod"

import { EnrichedZodError } from "./errors.ts"

/**
 * Parses the given data using a Zod schema and returns the parsed data if successful.
 * Throws an EnrichedZodError if the parsing fails.
 *
 * @example
 * const data = { name: 'John', age: 25 };
 * const schema = z.object({
 *   name: z.string(),
 *   age: z.number(),
 * });
 * const parsedData = parseWithZodSchema(data, schema);
 * console.log(parsedData); // { name: 'John', age: 25 }
 */
export function parseWithZodSchema<Schema extends z.ZodTypeAny>(data: unknown, schema: Schema): z.infer<Schema> {
  const parsed = schema.safeParse(data)
  if (parsed.success) return parsed.data
  throw new EnrichedZodError(parsed.error.issues, { data })
}

export function parseWithZodSchemaFromRequest<Schema extends z.ZodTypeAny>(
  opts: { data: unknown; schema: Schema; request: Request; requestBody?: string; response: Response },
): z.infer<Schema> {
  const parsed = opts.schema.safeParse(opts.data)
  if (parsed.success) return parsed.data
  throw new EnrichedZodError(parsed.error.issues, {
    data: opts.data,
    request: opts.request,
    requestBody: opts.requestBody,
    response: opts.response,
  })
}
