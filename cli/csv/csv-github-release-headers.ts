import { githubReleaseSchema } from "../../libs/github/api/releases/mod.ts"
import { yieldReleaseData } from "../../libs/metrics/mod.ts"

import { extractZodSchemaKeys, flattenObject, stringifyObject } from "../../utils/mod.ts"

const extraHeaders = [] as const

export const githubReleaseHeaders = [
  ...extraHeaders,
  ...Object.keys(flattenObject(extractZodSchemaKeys(githubReleaseSchema))).sort(),
]

export type GithubReleaseRow = Record<typeof githubReleaseHeaders[number], string>

export async function* githubReleasesAsCsv(
  iter: ReturnType<typeof yieldReleaseData>,
): AsyncGenerator<GithubReleaseRow> {
  for await (const el of iter) {
    yield {
      ...stringifyObject(flattenObject(el.release), { stringifyUndefined: true }),
    }
  }
}
