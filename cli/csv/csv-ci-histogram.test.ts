import { assertEquals } from "dev:asserts"

import { getFakeGithubActionRun } from "../../libs/github/api/action-run/get-fake-github-action-run.ts"
import { createFakeReadonlyGithubClient } from "../../libs/github/testing/create-fake-github-client.ts"
import { getFakeSyncInfo } from "../../libs/github/testing/get-fake-sync-info.ts"
import { yieldContinuousIntegrationHistogram } from "../../libs/metrics/mod.ts"

import { arrayToAsyncGenerator, asyncSingle, asyncToArray } from "../../utils/mod.ts"

import { ciHistogramAsCsv } from "./csv-ci-histogram.ts"

Deno.test("convert a CI histogram to a csv row", async () => {
  const input: ReturnType<typeof yieldContinuousIntegrationHistogram> = arrayToAsyncGenerator([{
    ids: [1, 2],
    branches: ["a", "b"],
    count: 2,
    start: new Date("2022-01-01T00:00:00Z"),
    end: new Date("2022-01-01T23:59:59Z"),
    conclusions: ["failure", "success"],
    paths: ["bar.yml", "foo.yml"],
    htmlUrls: ["https://example.com/1", "https://example.com/2"],
  }])

  const result = await asyncSingle(ciHistogramAsCsv(input))

  assertEquals(result, {
    "Period Start": "2022-01-01T00:00:00.000Z",
    "Period End": "2022-01-01T23:59:59.000Z",
    "Branches": "a; b",
    "# of Runs": "2",
    "Run IDs": "1; 2",
    "Conclusions": "failure; success",
    "Paths": "bar.yml; foo.yml",
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
