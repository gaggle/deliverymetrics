import { GithubActionRun, githubActionRunSchema } from "../../libs/github/api/action-run/mod.ts"
import { GithubActionWorkflow } from "../../libs/github/api/action-workflows/mod.ts"

import { extractZodSchemaKeys, flattenObject, stringifyObject } from "../../utils/mod.ts"

const extraHeaders = [] as const

export const githubActionRunHeaders = [
  ...extraHeaders,
  ...Object.keys(flattenObject(extractZodSchemaKeys(githubActionRunSchema))).sort(),
]

export type GithubActionRunRow = Record<typeof githubActionRunHeaders[number], string>

export async function* githubActionRunAsCsv(
  iter: AsyncGenerator<{ actionRun: GithubActionRun; workflow: GithubActionWorkflow }>,
): AsyncGenerator<GithubActionRunRow> {
  for await (const { actionRun } of iter) {
    yield {
      ...stringifyObject(flattenObject(actionRun), { stringifyUndefined: true }),
    }
  }
}
