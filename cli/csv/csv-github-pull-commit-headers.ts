import { BoundGithubPullCommit, boundGithubPullCommitSchema } from "../../libs/github/api/pull-commits/mod.ts"

import { extractZodSchemaKeys, flattenObject, stringifyObject } from "../../libs/utils/mod.ts"

const extraHeaders = [] as const

export const githubPullCommitHeaders = [
  ...extraHeaders,
  ...Object.keys(flattenObject(extractZodSchemaKeys(boundGithubPullCommitSchema))).sort(),
]

export type GithubPullCommitRow = Record<typeof githubPullCommitHeaders[number], string>

export async function* githubPullCommitsAsCsv(
  iter: AsyncGenerator<BoundGithubPullCommit>,
): AsyncGenerator<GithubPullCommitRow> {
  for await (const el of iter) {
    yield {
      ...stringifyObject(flattenObject(el), { stringifyUndefined: true }),
    }
  }
}
