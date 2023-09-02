import { yieldContinuousIntegrationHistogram } from "../../libs/metrics/mod.ts"

import { average, filterUndefined, toMins } from "../../utils/mod.ts"

export const ciHistogramHeaders = [
  "Period Start",
  "Period End",
  "Branches",
  "Paths",
  "# of Runs",
  "Avg. Durations (in minutes)",
  "# of Success",
  "Avg. Success Durations (in minutes)",
  "# of Failure",
  "Avg. Failure Durations (in minutes)",
  "# of Cancelled",
  "Avg. Cancelled Durations (in minutes)",
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
      "# of Cancelled": el.cancelledCount?.toString() || "0",
      "# of Failure": el.failureCount?.toString() || "0",
      "# of Runs": el.count.toString(),
      "# of Success": el.successCount?.toString() || "0",
      "Branches": el.branches.join("; "),
      "Avg. Cancelled Durations (in minutes)": durationToStr(el.cancelledDurations),
      "Cancelled IDs": el.cancelledIds?.join("; ") || "",
      "Conclusions": el.conclusions.join("; "),
      "Avg. Durations (in minutes)": durationToStr(el.durations),
      "Avg. Failure Durations (in minutes)": durationToStr(el.failureDurations),
      "Failure IDs": el.failureIds?.join("; ") || "",
      "Paths": el.paths.join("; "),
      "Period End": el.end.toISOString(),
      "Period Start": el.start.toISOString(),
      "Run IDs": el.ids.join("; "),
      "Avg. Success Durations (in minutes)": durationToStr(el.successDurations),
      "Success IDs": el.successIds?.join("; ") || "",
    }
  }
}

function durationToStr(nums: Array<number | undefined> | undefined): string {
  if (!nums) return ""
  const durations = filterUndefined(nums)
  return toMins(average(durations)).toPrecision(3)
}
