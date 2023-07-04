import { githubCommitSchema } from "../../libs/github/api/commits/mod.ts"

import { yieldCommitData } from "../../libs/metrics/mod.ts"
import { extractZodSchemaKeys, flattenObject, stringifyObject } from "../../libs/utils/mod.ts"

const extraHeaders = [
  "Contributors",
  "Commit Co-Authors",
] as const

export const githubCommitHeaders = [
  ...extraHeaders,
  ...Object.keys(flattenObject(extractZodSchemaKeys(githubCommitSchema))).sort(),
]

export type GithubCommitRow = Record<typeof githubCommitHeaders[number], string>

export async function* githubCommitsAsCsv(
  iter: ReturnType<typeof yieldCommitData>,
): AsyncGenerator<GithubCommitRow> {
  for await (const el of iter) {
    yield {
      "Commit Co-Authors": el.coauthors.join("; "),
      "Contributors": el.contributors.join("; "),
      ...stringifyObject(flattenObject(el.commit), { stringifyUndefined: true }),
    }
  }
}
