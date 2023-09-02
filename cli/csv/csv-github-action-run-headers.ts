import { githubActionRunSchema } from "../../libs/github/api/action-run/mod.ts"
import { GithubActionWorkflow } from "../../libs/github/api/action-workflows/mod.ts"
import { ActionRunData } from "../../libs/metrics/types.ts"

import { extractZodSchemaKeys, flattenObject, stringifyObject } from "../../utils/mod.ts"

const extraHeaders = [] as const

export const githubActionRunHeaders = [
  ...extraHeaders,
  ...Object.keys(flattenObject(extractZodSchemaKeys(githubActionRunSchema))).sort(),
]

export type GithubActionRunRow = Record<typeof githubActionRunHeaders[number], string>

export async function* githubActionRunAsCsv(
  iter: AsyncGenerator<{ actionRunData: ActionRunData; workflow: GithubActionWorkflow }>,
): AsyncGenerator<GithubActionRunRow> {
  for await (const { actionRunData } of iter) {
    yield {
      ...stringifyObject(flattenObject(actionRunData.run), { stringifyUndefined: true }),
    }
  }
}
