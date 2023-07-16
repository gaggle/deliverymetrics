import { z } from "https://deno.land/x/zod@v3.17.10/index.ts"

export const jiraPaginationFieldsSchema = z
  .object({
    startAt: z
      .number()
      .int()
      .optional()
      .describe("startAt is the index of the first item returned in the page."),
    maxResults: z
      .number()
      .int()
      .optional()
      .describe(
        "maxResults is the maximum number of items that a page can return. Each operation can have a different limit for the number of items returned, and these limits may change without notice. To find the maximum number of items that an operation could return, set maxResults to a large number—for example, over 1000—and if the returned value of maxResults is less than the requested value, the returned value is the maximum.",
      ),
    total: z
      .number()
      .int()
      .optional()
      .describe(
        "total is the total number of items contained in all pages. This number may change as the client requests the subsequent pages, therefore the client should always assume that the requested page can be empty. Note that this property is not returned for all operations.",
      ),
  })

export type JiraPaginationFields = z.infer<typeof jiraPaginationFieldsSchema>
