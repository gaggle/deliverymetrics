import { assertEquals } from "dev:asserts"

import { getFakeGithubActionRun } from "../../libs/github/api/action-run/get-fake-github-action-run.ts"
import { createFakeReadonlyGithubClient } from "../../libs/github/testing/create-fake-github-client.ts"
import { getFakeSyncInfo } from "../../libs/github/testing/get-fake-sync-info.ts"
import { yieldContinuousIntegrationHistogram } from "../../libs/metrics/mod.ts"

import { arrayToAsyncGenerator, asyncSingle, asyncToArray } from "../../utils/mod.ts"

import { ciHistogramAsCsv } from "./csv-ci-histogram.ts"

Deno.test("convert a CI histogram to a csv row", async () => {
  const input: ReturnType<typeof yieldContinuousIntegrationHistogram> = arrayToAsyncGenerator([{
    branches: ["a", "b"],
    conclusions: ["failure", "success"],
    count: 2,
    durations: [1000 * 60, 1000 * 60 * 2],
    end: new Date("2022-01-01T23:59:59Z"),
    failureCount: 1,
    failureIds: [2],
    htmlUrls: ["https://example.com/1", "https://example.com/2"],
    ids: [1, 2],
    paths: ["bar.yml", "foo.yml"],
    start: new Date("2022-01-01T00:00:00Z"),
    successCount: 1,
    successDurations: [undefined, 1000 * 60],
    successIds: [1],
  }])

  const result = await asyncSingle(ciHistogramAsCsv(input))

  assertEquals(result, {
    "# of Cancelled": "0",
    "# of Failure": "1",
    "# of Runs": "2",
    "# of Success": "1",
    "Avg. Cancelled Durations (in minutes)": "",
    "Avg. Durations (in minutes)": "1.50",
    "Avg. Failure Durations (in minutes)": "",
    "Avg. Success Durations (in minutes)": "1.00",
    "Branches": "a; b",
    "Cancelled IDs": "",
    "Conclusions": "failure; success",
    "Failure IDs": "2",
    "Paths": "bar.yml; foo.yml",
    "Period End": "2022-01-01T23:59:59.000Z",
    "Period Start": "2022-01-01T00:00:00.000Z",
    "Run IDs": "1; 2",
    "Success IDs": "1",
  })
})

Deno.test("actually integrates with its metrics yielder function counterpart", async () => {
  const rows = await asyncToArray(ciHistogramAsCsv(yieldContinuousIntegrationHistogram(
    await createFakeReadonlyGithubClient({
      actionRuns: [getFakeGithubActionRun()],
      syncInfos: [getFakeSyncInfo({ type: "action-run" })],
    }),
    { mode: "daily" },
  )))

  assertEquals(rows.length, 1)
})
