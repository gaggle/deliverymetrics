import { toDays } from "../../libs/utils/mod.ts"
import { yieldPullRequestHistogram } from "../../libs/metrics/mod.ts"

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
      "Lead Time (in days)": toDays(el.leadTime).toPrecision(2),
      "Time to Merge (in days)": el.timeToMerge ? toDays(el.timeToMerge).toPrecision(2) : "",
      "# of PRs Merged": el.mergedPRs.length.toString(),
      "Merged PRs": el.mergedPRs.join("; "),
    }
  }
}
