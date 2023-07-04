import { GithubCommit } from "../github/api/commits/mod.ts"

import { ReadonlyGithubClient } from "../github/mod.ts"

import { AbortError } from "../errors.ts"

type YieldCommitData = {
  commit: GithubCommit
  coauthors: string[]
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
    yield {
      commit,
      coauthors: extractCoAuthoredBy(commit.commit.message),
    }
  }
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
