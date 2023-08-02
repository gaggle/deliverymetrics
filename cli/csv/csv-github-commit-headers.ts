import { githubCommitSchema } from "../../libs/github/api/commits/mod.ts"

import { yieldCommitData } from "../../libs/metrics/mod.ts"
import { extractZodSchemaKeys, flattenObject, stringifyObject } from "../../utils/mod.ts"

const extraHeaders = [
  "Contributors",
  "# Contributors",
  "Commit Co-Authors",
  "# Commit Co-Authors",
  "Title",
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
      "# Commit Co-Authors": el.coauthors.length.toString(),
      "Contributors": el.contributors.join("; "),
      "# Contributors": el.contributors.length.toString(),
      "Title": el.commit.commit.message.split("\n")[0],
      ...stringifyObject(flattenObject(el.commit), { stringifyUndefined: true }),
    }
  }
}
