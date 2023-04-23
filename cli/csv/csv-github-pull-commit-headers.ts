import { BoundGithubPullCommit, boundGithubPullCommitSchema } from "../../libs/github/mod.ts"

import { ToTuple } from "../../libs/types.ts"

const extraHeaders = [
  "Author Date",
  "Author Name",
  "Author Email",
  "Committer Date",
  "Committer Name",
  "Committer Email",
] as const

export const githubPullCommitHeaders = [
  ...extraHeaders,
  ...Object.keys(boundGithubPullCommitSchema.shape).sort(),
] as unknown as GithubPullCommitHeaders

type GithubPullCommitHeader = typeof extraHeaders[number] | keyof BoundGithubPullCommit

export type GithubPullCommitHeaders = ToTuple<GithubPullCommitHeader>

export type GithubPullCommitRow = Record<GithubPullCommitHeaders[number], string>

export async function* githubPullCommitsAsCsv(
  iter: AsyncGenerator<BoundGithubPullCommit>,
): AsyncGenerator<GithubPullCommitRow> {
  for await (const el of iter) {
    yield {
      "Author Date": el.commit.author?.date || "",
      "Author Name": el.commit.author?.name || "",
      "Author Email": el.commit.author?.email || "",
      "Committer Date": el.commit.committer?.date || "",
      "Committer Name": el.commit.committer?.name || "",
      "Committer Email": el.commit.committer?.email || "",
      author: JSON.stringify(el.author),
      comments_url: el.comments_url,
      commit: JSON.stringify(el.commit),
      committer: JSON.stringify(el.committer),
      files: JSON.stringify(el.files) || "",
      html_url: el.html_url,
      node_id: el.node_id,
      parents: JSON.stringify(el.parents),
      pr: el.pr.toString(),
      sha: el.sha,
      stats: JSON.stringify(el.stats) || "",
      url: el.url,
    }
  }
}
