import { GithubRelease } from "../github/api/releases/mod.ts"

import { ReadonlyGithubClient } from "../github/mod.ts"
import { daysBetween } from "../utils/mod.ts"

import { AbortError } from "../../utils/errors.ts"

type YieldReleaseData = {
  release: GithubRelease
}

export async function* yieldReleaseData(
  gh: ReadonlyGithubClient,
  { publishedMaxDaysAgo, signal }: Partial<
    {
      publishedMaxDaysAgo: number
      signal: AbortSignal
    }
  > = {},
): AsyncGenerator<YieldReleaseData> {
  const latestSync = await gh.findLatestSync({ type: "release" })
  if (!latestSync) return

  for await (const release of gh.findReleases()) {
    if (signal?.aborted) {
      throw new AbortError()
    }

    if (
      publishedMaxDaysAgo !== undefined &&
      release.published_at &&
      daysBetween(new Date(release.published_at), new Date(latestSync.updatedAt!)) > (publishedMaxDaysAgo || Infinity)
    ) {
      continue
    }

    yield {
      release,
    }
  }
}
