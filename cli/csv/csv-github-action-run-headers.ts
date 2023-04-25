import { ActionRun, actionRunSchema, ActionWorkflow } from "../../libs/github/schemas/mod.ts"

import { extractZodSchemaKeys, flattenObject, stringifyObject } from "../../libs/utils/mod.ts"

const extraHeaders = [] as const

export const githubActionRunHeaders = [
  ...extraHeaders,
  ...Object.keys(flattenObject(extractZodSchemaKeys(actionRunSchema))).sort(),
]

export type GithubActionRunRow = Record<typeof githubActionRunHeaders[number], string>

export async function* githubActionRunAsCsv(
  iter: AsyncGenerator<{ actionRun: ActionRun; workflow: ActionWorkflow }>,
): AsyncGenerator<GithubActionRunRow> {
  for await (const { actionRun } of iter) {
    yield {
      ...stringifyObject(flattenObject(actionRun), { stringifyUndefined: true }),
    }
  }
}
