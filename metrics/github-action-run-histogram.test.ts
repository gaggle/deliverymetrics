import { assertEquals } from "dev:asserts";

import { createFakeReadonlyGithubClient, getFakeActionRun } from "../github/testing.ts";

import { asyncToArray } from "../utils.ts";

import { yieldActionRunHistogram } from "./github-action-run-histogram.ts";

Deno.test("yieldActionRunHistogram", async (t) => {
  await t.step("for daily histogram", async (t) => {
    await t.step("calculates two workflow runs in a day", async () => {
      const github = await createFakeReadonlyGithubClient({
        actionsRuns: [
          getFakeActionRun({
            id: 1,
            html_url: "example.org/1",
            path: "foo.yml",
            created_at: "2022-01-01T09:00:00Z",
            updated_at: "2022-01-01T10:00:00Z",
          }),
          getFakeActionRun({
            id: 2,
            html_url: "example.org/2",
            path: "foo.yml",
            created_at: "2022-01-01T19:00:00Z",
            updated_at: "2022-01-01T20:00:00Z",
          }),
        ],
      });

      assertEquals(
        await asyncToArray(yieldActionRunHistogram(github, {
          mode: "daily",
          workflow: { path: "foo.yml" },
        })),
        [{
          start: new Date("2022-01-01T00:00:00.000Z"),
          end: new Date("2022-01-01T23:59:59.999Z"),
          count: 2,
          ids: [1, 2],
          htmlUrls: ["example.org/1", "example.org/2"],
        }],
      );
    });

    await t.step("calculates two workflow runs on different days", async () => {
      const github = await createFakeReadonlyGithubClient({
        actionsRuns: [
          getFakeActionRun({
            id: 1,
            html_url: "example.org/1",
            path: "foo.yml",
            created_at: "2022-01-01T23:00:00Z",
            updated_at: "2022-01-01T23:59:59Z",
          }),
          getFakeActionRun({
            id: 2,
            html_url: "example.org/2",
            path: "foo.yml",
            created_at: "2022-01-02T00:00:00Z",
            updated_at: "2022-01-02T00:00:01Z",
          }),
        ],
      });

      assertEquals(
        await asyncToArray(yieldActionRunHistogram(github, {
          mode: "daily",
          workflow: { path: "foo.yml" },
        })),
        [
          {
            start: new Date("2022-01-01T00:00:00.000Z"),
            end: new Date("2022-01-01T23:59:59.999Z"),
            count: 1,
            ids: [1],
            htmlUrls: ["example.org/1"],
          },
          {
            start: new Date("2022-01-02T00:00:00.000Z"),
            end: new Date("2022-01-02T23:59:59.999Z"),
            count: 1,
            ids: [2],
            htmlUrls: ["example.org/2"],
          },
        ],
      );
    });
  });

  await t.step("for weekly histogram", async (t) => {
    await t.step("calculates two workflow runs in same week", async () => {
      const github = await createFakeReadonlyGithubClient({
        actionsRuns: [
          getFakeActionRun({
            id: 1,
            html_url: "example.org/1",
            path: "foo.yml",
            created_at: "2022-01-03T00:00:00Z",
            updated_at: "2022-01-03T00:00:00Z",
          }),
          getFakeActionRun({
            id: 2,
            html_url: "example.org/2",
            path: "foo.yml",
            created_at: "2022-01-04T00:00:00Z",
            updated_at: "2022-01-04T00:00:00Z",
          }),
        ],
      });

      assertEquals(
        await asyncToArray(yieldActionRunHistogram(github, {
          mode: "weekly",
          workflow: { path: "foo.yml" },
        })),
        [{
          start: new Date("2022-01-03T00:00:00.000Z"),
          end: new Date("2022-01-09T23:59:59.999Z"),
          count: 2,
          ids: [1, 2],
          htmlUrls: ["example.org/1", "example.org/2"],
        }],
      );
    });
  });

  await t.step("for monthy histogram", async (t) => {
    await t.step("calculates two workflow runs in the same month", async () => {
      const github = await createFakeReadonlyGithubClient({
        actionsRuns: [
          getFakeActionRun({
            id: 1,
            html_url: "example.org/1",
            path: "foo.yml",
            created_at: "2022-01-03T00:00:00Z",
            updated_at: "2022-01-03T00:00:00Z",
          }),
          getFakeActionRun({
            id: 2,
            html_url: "example.org/2",
            path: "foo.yml",
            created_at: "2022-01-31T00:00:00Z",
            updated_at: "2022-01-31T00:00:00Z",
          }),
        ],
      });

      assertEquals(
        await asyncToArray(yieldActionRunHistogram(github, {
          mode: "monthly",
          workflow: { path: "foo.yml" },
        })),
        [{
          start: new Date("2022-01-01T00:00:00.000Z"),
          end: new Date("2022-01-31T23:59:59.999Z"),
          count: 2,
          ids: [1, 2],
          htmlUrls: ["example.org/1", "example.org/2"],
        }],
      );
    });
  });
});
