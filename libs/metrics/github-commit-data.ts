import { GithubCommit } from "../github/api/commits/mod.ts"

import { ReadonlyGithubClient } from "../github/mod.ts"
import { daysBetween } from "../utils/mod.ts"

import { AbortError } from "../errors.ts"

type YieldCommitData = {
  coauthors: string[]
  commit: GithubCommit
  contributors: string[]
}

export async function* yieldCommitData(
  gh: ReadonlyGithubClient,
  { authoredMaxDaysAgo, committedMaxDaysAgo, signal }: Partial<
    {
      authoredMaxDaysAgo: number
      committedMaxDaysAgo: number
      signal: AbortSignal
    }
  > = {},
): AsyncGenerator<YieldCommitData> {
  const latestSync = await gh.findLatestSync({ type: "commit" })
  if (!latestSync) return

  for await (const commit of gh.findCommits()) {
    if (signal?.aborted) {
      throw new AbortError()
    }

    if (
      authoredMaxDaysAgo !== undefined &&
      commit.commit.author?.date &&
      daysBetween(new Date(commit.commit.author.date), new Date(latestSync.updatedAt!)) >
      (authoredMaxDaysAgo || Infinity)
    ) {
      continue
    }

    if (
      committedMaxDaysAgo !== undefined &&
      commit.commit.committer?.date &&
      daysBetween(new Date(commit.commit.committer.date), new Date(latestSync.updatedAt!)) >
      (committedMaxDaysAgo || Infinity)
    ) {
      continue
    }

    const coauthors = extractCoAuthoredBy(commit.commit.message)
    const contributors = ([
      nameAndEmail(commit.commit.author || {}),
      nameAndEmail(commit.commit.committer || {}),
      ...coauthors,
    ]
      .filter((el) => el !== undefined)
      .filter((v, i, a) => a.indexOf(v) === i)) as string[]
    yield {
      commit,
      coauthors,
      contributors,
    }
  }
}

function nameAndEmail({ name, email }: { name?: string; email?: string }): string | undefined {
  if (!name && !email) return
  let msg = ""
  if (name) msg += name
  if (email) msg += name ? ` <${email}>` : `<${email}>`
  return msg
}

function extractCoAuthoredBy(msg: string): string[] {
  return msg
    .split("\n")
    .reduce((acc, curr) => {
      const needle = "co-authored-by:"
      const idx = curr.toLowerCase().indexOf(needle)
      if (idx > -1) {
        return [...acc, curr.slice(idx + needle.length).trim()]
      }
      return acc
    }, [] as string[])
}
