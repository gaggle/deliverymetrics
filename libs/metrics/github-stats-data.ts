import { DBCodeFrequency } from "../github/api/stats-code-frequency/mod.ts"

import { ReadonlyGithubClient } from "../github/mod.ts"

import { AbortError } from "../errors.ts"

type YieldStatsCodeFrequencyData = {
  codeFrequency: DBCodeFrequency
}

export async function* yieldStatsCodeFrequency(
  gh: ReadonlyGithubClient,
  { signal }: Partial<{ signal: AbortSignal }> = {},
): AsyncGenerator<YieldStatsCodeFrequencyData> {
  const latestSync = await gh.findLatestSync({ type: "stats-code-frequency" })
  if (!latestSync) return

  for await (const codeFrequency of gh.findStatsCodeFrequencies()) {
    if (signal?.aborted) {
      throw new AbortError()
    }

    yield {
      codeFrequency,
    }
  }
}
