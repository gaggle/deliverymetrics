import { githubActionRunSchema } from "../../libs/github/api/action-run/mod.ts"
import { GithubActionWorkflow } from "../../libs/github/api/action-workflows/mod.ts"
import { ActionRunData } from "../../libs/metrics/types.ts"

import { extractZodSchemaKeys, flattenObject, stringifyObject, toMins } from "../../utils/mod.ts"

const extraHeaders = ["Duration (in minutes)"] as const

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
      "Duration (in minutes)": actionRunData.duration ? (toMins(actionRunData.duration).toPrecision(3)).toString() : "",
      ...stringifyObject(flattenObject(actionRunData.run), { stringifyUndefined: true }),
    }
  }
}
