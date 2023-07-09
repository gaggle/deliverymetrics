import { DBCodeFrequency } from "../github/api/stats-code-frequency/mod.ts"

import { ReadonlyGithubClient } from "../github/mod.ts"
import { daysBetween } from "../utils/mod.ts"

import { AbortError } from "../errors.ts"

type YieldStatsCodeFrequencyData = {
  codeFrequency: DBCodeFrequency
}

export async function* yieldStatsCodeFrequency(
  gh: ReadonlyGithubClient,
  { maxDays, signal }: Partial<{ maxDays: number; signal: AbortSignal }> = {},
): AsyncGenerator<YieldStatsCodeFrequencyData> {
  const latestSync = await gh.findLatestSync({ type: "stats-code-frequency" })
  if (!latestSync) return

  for await (const el of gh.findStatsCodeFrequencies()) {
    if (signal?.aborted) {
      throw new AbortError()
    }

    if (daysBetween(new Date(el.timeStr), new Date(latestSync.updatedAt!)) > (maxDays || Infinity)) {
      continue
    }

    yield {
      codeFrequency: el,
    }
  }
}
