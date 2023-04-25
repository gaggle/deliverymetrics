import { extractZodSchemaKeys, flattenObject, stringifyObject, toDays } from "../../libs/utils/mod.ts"
import { yieldPullRequestData } from "../../libs/metrics/mod.ts"
import { githubPullSchema } from "../../libs/github/mod.ts"

const extraHeaders = [
  "Lead Time (in days)",
  "Time to Merge (in days)",
  "Was Cancelled?",
  "Commits Authors",
  "Commits Committers",
  "Commits Count",
  "Head Ref",
] as const

export const githubPullHeaders = [
  ...extraHeaders,
  ...Object.keys(flattenObject(extractZodSchemaKeys(githubPullSchema))).sort(),
]

export type GithubPullRow = Record<typeof githubPullHeaders[number], string>

export async function* githubPullsAsCsv(iter: ReturnType<typeof yieldPullRequestData>): AsyncGenerator<GithubPullRow> {
  for await (const el of iter) {
    yield {
      "Commits Authors": el.commits.map((el) => el.commit?.author?.name)
        .filter((v, i, a) => a.indexOf(v) === i) // Make unique
        .join("; "),
      "Commits Committers": el.commits.map((el) => el.commit?.committer?.name)
        .filter((v, i, a) => a.indexOf(v) === i) // Make unique
        .join("; "),
      "Commits Count": el.commits.length.toString(),
      "Head Ref": el.pull.head.ref,
      "Lead Time (in days)": el.leadTime ? toDays(el.leadTime).toPrecision(2) : "",
      "Time to Merge (in days)": el.timeToMerge ? toDays(el.timeToMerge).toPrecision(2) : "",
      "Was Cancelled?": Boolean(el.pull.closed_at && el.pull.merged_at === null).toString(),
      ...stringifyObject(flattenObject(el.pull), { stringifyUndefined: true }),
    }
  }
}
