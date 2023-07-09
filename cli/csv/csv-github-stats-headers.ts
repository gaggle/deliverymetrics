import { dbCodeFrequencySchema } from "../../libs/github/api/stats-code-frequency/mod.ts"

import { yieldStatsCodeFrequency } from "../../libs/metrics/mod.ts"
import { extractZodSchemaKeys, flattenObject, stringifyObject } from "../../libs/utils/mod.ts"

const extraStatsCodeFrequencyHeaders = [] as const

export const githubStatsCodeFrequencyHeaders = [
  ...extraStatsCodeFrequencyHeaders,
  ...Object.keys(flattenObject(extractZodSchemaKeys(dbCodeFrequencySchema))).sort(),
]

export type GithubStatsCodeFrequencyRow = Record<typeof githubStatsCodeFrequencyHeaders[number], string>

export async function* githubStatsCodeFrequenciesAsCsv(
  iter: ReturnType<typeof yieldStatsCodeFrequency>,
): AsyncGenerator<GithubStatsCodeFrequencyRow> {
  for await (const el of iter) {
    yield {
      ...stringifyObject(flattenObject(el.codeFrequency), { stringifyUndefined: true }),
    }
  }
}
