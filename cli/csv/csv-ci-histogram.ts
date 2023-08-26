import { yieldContinuousIntegrationHistogram } from "../../libs/metrics/mod.ts"

export const ciHistogramHeaders = [
  "Period Start",
  "Period End",
  "Branches",
  "# of Runs",
  "Run IDs",
  "Conclusions",
  "Paths",
] as const

export type CIHistogramRow = Record<typeof ciHistogramHeaders[number], string>

export async function* ciHistogramAsCsv(
  iter: ReturnType<typeof yieldContinuousIntegrationHistogram>,
): AsyncGenerator<CIHistogramRow> {
  for await (const el of iter) {
    yield {
      "Period Start": el.start.toISOString(),
      "Period End": el.end.toISOString(),
      "Branches": el.branches.join("; "),
      "# of Runs": el.count.toString(),
      "Run IDs": el.ids.join("; "),
      "Conclusions": el.conclusions.join("; "),
      "Paths": el.paths.join("; "),
    }
  }
}
