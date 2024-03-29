import { yieldPullRequestHistogram } from "../../libs/metrics/mod.ts"

import { toDaysRounded } from "../../utils/mod.ts"

export const pullRequestHistogramHeaders = [
  "Period Start",
  "Period End",
  "Lead Time (in days)",
  "Time to Merge (in days)",
  "# of PRs Merged",
  "Merged PRs",
] as const

export type PullRequestHistogramRow = Record<typeof pullRequestHistogramHeaders[number], string>

export async function* pullRequestHistogramAsCsv(
  iter: ReturnType<typeof yieldPullRequestHistogram>,
): AsyncGenerator<PullRequestHistogramRow> {
  for await (const el of iter) {
    yield {
      "Period Start": el.start.toISOString(),
      "Period End": el.end.toISOString(),
      "Lead Time (in days)": toDaysRounded(el.leadTime).toPrecision(2),
      "Time to Merge (in days)": el.timeToMerge ? toDaysRounded(el.timeToMerge).toPrecision(2) : "",
      "# of PRs Merged": el.mergedPRs.length.toString(),
      "Merged PRs": el.mergedPRs.join("; "),
    }
  }
}
