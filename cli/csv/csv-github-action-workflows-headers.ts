import { actionWorkflowSchema } from "../../libs/github/schemas/mod.ts"

import { yieldActionData } from "../../libs/metrics/mod.ts"
import { extractZodSchemaKeys, flattenObject, stringifyObject } from "../../libs/utils/mod.ts"

const extraHeaders = [] as const

export const githubActionWorkflowHeaders = [
  ...extraHeaders,
  ...Object.keys(flattenObject(extractZodSchemaKeys(actionWorkflowSchema))).sort(),
]

export type GithubActionWorkflowRow = Record<typeof githubActionWorkflowHeaders[number], string>

export async function* githubActionWorkflowAsCsv(
  iter: ReturnType<typeof yieldActionData>,
): AsyncGenerator<GithubActionWorkflowRow> {
  for await (const { actionWorkflow } of iter) {
    yield {
      ...stringifyObject(flattenObject(actionWorkflow), { stringifyUndefined: true }),
    }
  }
}
