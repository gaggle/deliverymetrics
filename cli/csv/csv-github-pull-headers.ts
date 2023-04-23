import { toDays } from "../../libs/utils/mod.ts"
import { yieldPullRequestData } from "../../libs/metrics/mod.ts"
import { GithubPull, githubPullSchema } from "../../libs/github/mod.ts"

import { ToTuple } from "../../libs/types.ts"

const extraHeaders = [
  "Lead Time (in days)",
  "Time to Merge (in days)",
  "Was Cancelled?",
  "Commits Authors",
  "Commits Committers",
  "Commits Count",
] as const

export const githubPullHeaders = [
  ...extraHeaders,
  ...Object.keys(githubPullSchema.shape).sort(),
] as unknown as GithubPullHeaders

/**
 * Type union of all headers
 */
type GithubPullHeader = typeof extraHeaders[number] | keyof GithubPull

/**
 * Tuple of all headers, i.e. to satisfy this type all headers must be fully specified
 *
 * To get the type-variant of an array that can contain headers use `Array<GithubPullHeaders[number]>`
 */
export type GithubPullHeaders = ToTuple<GithubPullHeader>

export type GithubPullRow = Record<GithubPullHeaders[number], string>

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
      "Lead Time (in days)": el.leadTime ? toDays(el.leadTime).toPrecision(2) : "",
      "Time to Merge (in days)": el.timeToMerge ? toDays(el.timeToMerge).toPrecision(2) : "",
      "Was Cancelled?": Boolean(el.pull.closed_at && el.pull.merged_at === null).toString(),
      _links: JSON.stringify(el.pull._links, null, 2),
      base: JSON.stringify(el.pull.base, null, 2),
      body: el.pull.body || "",
      closed_at: el.pull.closed_at || "",
      comments_url: el.pull.comments_url,
      commits_url: el.pull.commits_url,
      created_at: el.pull.created_at,
      draft: el.pull.draft.toString(),
      head: JSON.stringify(el.pull.head, null, 2),
      html_url: el.pull.html_url,
      id: el.pull.id.toString(),
      labels: el.pull.labels.map((el) => el.name).join("; "),
      locked: el.pull.locked.toString(),
      merge_commit_sha: el.pull.merge_commit_sha,
      merged_at: el.pull.merged_at || "",
      node_id: el.pull.node_id,
      number: el.pull.number.toString(),
      review_comment_url: el.pull.review_comment_url,
      review_comments_url: el.pull.review_comments_url,
      state: el.pull.state,
      statuses_url: el.pull.statuses_url,
      title: JSON.stringify(el.pull.title, null, 2),
      updated_at: el.pull.updated_at,
      url: el.pull.url,
    }
  }
}
