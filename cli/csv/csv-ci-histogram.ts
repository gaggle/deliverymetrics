import { yieldContinuousIntegrationHistogram } from "../../libs/metrics/mod.ts"

export const ciHistogramHeaders = [
  "Period Start",
  "Period End",
  "Branches",
  "Paths",
  "# of Runs",
  "# of Success",
  "# of Failure",
  "# of Cancelled",
  "Conclusions",
  "Run IDs",
  "Success IDs",
  "Failure IDs",
  "Cancelled IDs",
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
      "Paths": el.paths.join("; "),
      "# of Runs": el.count.toString(),
      "# of Success": el.successCount?.toString() || "0",
      "# of Failure": el.failureCount?.toString() || "0",
      "# of Cancelled": el.cancelledCount?.toString() || "0",
      "Conclusions": el.conclusions.join("; "),
      "Run IDs": el.ids.join("; "),
      "Success IDs": el.successIds?.join("; ") || "",
      "Failure IDs": el.failureIds?.join("; ") || "",
      "Cancelled IDs": el.cancelledIds?.join("; ") || "",
    }
  }
}
