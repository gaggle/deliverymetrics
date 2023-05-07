import { assertEquals } from "dev:asserts"

import { createFakeReadonlyGithubClient, getFakeActionRun } from "../github/testing/mod.ts"

import { asyncToArray } from "../utils/mod.ts"

import { yieldActionRunHistogram } from "./github-action-run-histogram.ts"

Deno.test("yieldActionRunHistogram", async (t) => {
  await t.step("for daily histogram", async (t) => {
    await t.step("calculates two workflow runs in a day", async () => {
      const github = await createFakeReadonlyGithubClient({
        actionRuns: [
          getFakeActionRun({
            id: 1,
            html_url: "example.org/1",
            path: "foo.yml",
            created_at: "2022-01-01T09:00:00Z",
            updated_at: "2022-01-01T10:00:00Z",
            head_branch: "main",
            conclusion: "success",
          }),
          getFakeActionRun({
            id: 2,
            html_url: "example.org/2",
            path: "foo.yml",
            created_at: "2022-01-01T19:00:00Z",
            updated_at: "2022-01-01T20:00:00Z",
            head_branch: "main",
            conclusion: "failure",
          }),
        ],
      })

      assertEquals(
        await asyncToArray(yieldActionRunHistogram(github, {
          mode: "daily",
          branch: "main",
          conclusion: /failure|success/,
          workflow: { path: "foo.yml" },
        })),
        [{
          start: new Date("2022-01-01T00:00:00.000Z"),
          end: new Date("2022-01-01T23:59:59.999Z"),
          count: 2,
          ids: [1, 2],
          htmlUrls: ["example.org/1", "example.org/2"],
          conclusions: ["failure", "success"],
        }],
      )
    })

    await t.step("calculates two workflow runs on different days", async () => {
      const github = await createFakeReadonlyGithubClient({
        actionRuns: [
          getFakeActionRun({
            id: 1,
            html_url: "example.org/1",
            path: "foo.yml",
            created_at: "2022-01-01T23:00:00Z",
            updated_at: "2022-01-01T23:59:59Z",
            head_branch: "main",
            conclusion: "success",
          }),
          getFakeActionRun({
            id: 2,
            html_url: "example.org/2",
            path: "foo.yml",
            created_at: "2022-01-02T00:00:00Z",
            updated_at: "2022-01-02T00:00:01Z",
            head_branch: "main",
            conclusion: "success",
          }),
        ],
      })

      assertEquals(
        await asyncToArray(yieldActionRunHistogram(github, {
          mode: "daily",
          branch: "main",
          conclusion: "success",
          workflow: { path: "foo.yml" },
        })),
        [
          {
            start: new Date("2022-01-01T00:00:00.000Z"),
            end: new Date("2022-01-01T23:59:59.999Z"),
            count: 1,
            ids: [1],
            htmlUrls: ["example.org/1"],
            conclusions: ["success"],
          },
          {
            start: new Date("2022-01-02T00:00:00.000Z"),
            end: new Date("2022-01-02T23:59:59.999Z"),
            count: 1,
            ids: [2],
            htmlUrls: ["example.org/2"],
            conclusions: ["success"],
          },
        ],
      )
    })
  })

  await t.step("for weekly histogram", async (t) => {
    await t.step("calculates two workflow runs in same week", async () => {
      const github = await createFakeReadonlyGithubClient({
        actionRuns: [
          getFakeActionRun({
            id: 1,
            html_url: "example.org/1",
            path: "foo.yml",
            created_at: "2022-01-03T00:00:00Z",
            updated_at: "2022-01-03T00:00:00Z",
            head_branch: "main",
            conclusion: "success",
          }),
          getFakeActionRun({
            id: 2,
            html_url: "example.org/2",
            path: "foo.yml",
            created_at: "2022-01-04T00:00:00Z",
            updated_at: "2022-01-04T00:00:00Z",
            head_branch: "main",
            conclusion: "success",
          }),
        ],
      })

      assertEquals(
        await asyncToArray(yieldActionRunHistogram(github, {
          mode: "weekly",
          branch: "main",
          conclusion: "success",
          workflow: { path: "foo.yml" },
        })),
        [{
          start: new Date("2022-01-03T00:00:00.000Z"),
          end: new Date("2022-01-09T23:59:59.999Z"),
          count: 2,
          ids: [1, 2],
          htmlUrls: ["example.org/1", "example.org/2"],
          conclusions: ["success"],
        }],
      )
    })
  })

  await t.step("for monthy histogram", async (t) => {
    await t.step("calculates two workflow runs in the same month", async () => {
      const github = await createFakeReadonlyGithubClient({
        actionRuns: [
          getFakeActionRun({
            id: 1,
            html_url: "example.org/1",
            path: "foo.yml",
            created_at: "2022-01-03T00:00:00Z",
            updated_at: "2022-01-03T00:00:00Z",
            head_branch: "main",
            conclusion: "success",
          }),
          getFakeActionRun({
            id: 2,
            html_url: "example.org/2",
            path: "foo.yml",
            created_at: "2022-01-31T00:00:00Z",
            updated_at: "2022-01-31T00:00:00Z",
            head_branch: "main",
            conclusion: "success",
          }),
        ],
      })

      assertEquals(
        await asyncToArray(yieldActionRunHistogram(github, {
          mode: "monthly",
          branch: "main",
          conclusion: "success",
          workflow: { path: "foo.yml" },
        })),
        [{
          start: new Date("2022-01-01T00:00:00.000Z"),
          end: new Date("2022-01-31T23:59:59.999Z"),
          count: 2,
          ids: [1, 2],
          htmlUrls: ["example.org/1", "example.org/2"],
          conclusions: ["success"],
        }],
      )
    })
  })
})
