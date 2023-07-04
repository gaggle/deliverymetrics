import { GithubCommit } from "../github/api/commits/mod.ts"

import { ReadonlyGithubClient } from "../github/mod.ts"

import { AbortError } from "../errors.ts"

type YieldCommitData = {
  coauthors: string[]
  commit: GithubCommit
  contributors: string[]
}

export async function* yieldCommitData(
  gh: ReadonlyGithubClient,
  { signal }: Partial<
    {
      maxDays: number
      includeBranches: Array<string | RegExp>
      excludeBranches: Array<string | RegExp>
      includeLabels: Array<string | RegExp>
      excludeLabels: Array<string | RegExp>
      includeCancelled: boolean
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
