import { assertEquals, assertObjectMatch } from "dev:asserts";

import { createFakeReadonlyGithubClient, getFakePull, getFakePullCommit, getFakeSyncInfo } from "../github/testing.ts";

import { asyncToArray, single } from "../utils.ts";

import { yieldPullRequestLeadTime } from "./github-pr-lead-time.ts";

Deno.test("yieldPullRequestLeadTime", async (t) => {
  await t.step("for daily lead times", async (t) => {
    await t.step("for a single merged PR", async (t) => {
      const github = await createFakeReadonlyGithubClient({
        pulls: [getFakePull({
          number: 1,
          created_at: "2022-01-10T00:00:00Z",
          merged_at: "2022-01-15T00:00:00Z",
        })],
        pullCommits: [
          getFakePullCommit({
            pr: 1,
            commit: { author: { date: "2022-01-01T00:00:00Z" }, committer: { date: "2022-01-05T00:00:00Z" } },
          }),
        ],
        syncInfos: [getFakeSyncInfo({
          createdAt: new Date("2022-01-20T00:00:00Z").getTime(),
          updatedAt: new Date("2022-01-20T00:00:00Z").getTime(),
        })],
      });

      const result = await single(yieldPullRequestLeadTime(github, { mode: "daily" }));

      await t.step("calculates a the start and end period of a single merged PR", () =>
        assertObjectMatch(result, {
          start: new Date("2022-01-05T00:00:00.000Z"),
          end: new Date("2022-01-05T23:59:59.999Z"),
        }));

      await t.step("calculates that one PR got merged", () => assertObjectMatch(result, { mergedPRs: [1] }));

      await t.step(
        "calculates Lead Time",
        () => assertObjectMatch(result, { leadTime: 518_400_000 }),
      );
      await t.step(
        "calculates Time to Merge",
        () => assertObjectMatch(result, { timeToMerge: 1_296_000_000 }),
      );
    });

    await t.step(
      "can filter a pull based on label",
      async () => {
        const github = await createFakeReadonlyGithubClient({
          pulls: [
            getFakePull({
              number: 1,
              created_at: "2022-01-01T00:00:00Z",
              merged_at: "2022-01-05T00:00:00Z",
              labels: [
                {
                  "id": 123,
                  "node_id": "AB_c",
                  "url": "https://api.github.com/repos/owner/repo/labels/Foo",
                  "name": "Foo",
                  "color": "9CD54A",
                  "default": false,
                  "description": "Foo description",
                },
                {
                  "id": 234,
                  "node_id": "AB_d",
                  "url": "https://api.github.com/repos/owner/repo/labels/Bar%20%F0%9F%98%8E",
                  "name": "Bar 😎",
                  "color": "8B4FDF",
                  "default": false,
                  "description": "Bar?",
                },
              ],
            }),
            getFakePull({
              number: 2,
              created_at: "2022-09-21T00:00:00Z",
              merged_at: "2022-09-30T00:00:00Z",
            }),
          ],
          syncInfos: [getFakeSyncInfo({
            createdAt: new Date("2022-01-01T00:00:00Z").getTime(),
            updatedAt: new Date("2022-01-01T00:00:00Z").getTime(),
          })],
        });

        assertObjectMatch(
          await single(yieldPullRequestLeadTime(github, { mode: "daily", excludeLabels: ["Bar 😎"] })),
          {
            start: new Date("2022-09-30T00:00:00.000Z"),
            end: new Date("2022-09-30T23:59:59.999Z"),
            leadTime: 864_000_000,
            mergedPRs: [2],
          },
        );

        assertObjectMatch(
          await single(yieldPullRequestLeadTime(github, { mode: "daily", includeLabels: ["Bar 😎"] })),
          {
            start: new Date("2022-01-05T00:00:00.000Z"),
            end: new Date("2022-01-05T23:59:59.999Z"),
            leadTime: 432_000_000,
            mergedPRs: [1],
          },
        );
      },
    );

    await t.step(
      "can filter a pull based on head branch",
      async () => {
        const github = await createFakeReadonlyGithubClient({
          pulls: [
            getFakePull({
              number: 1,
              created_at: "2022-01-01T00:00:00Z",
              merged_at: "2022-01-05T00:00:00Z",
              head: {
                "label": "owner:branch-name",
                "ref": "branch-name",
                "sha": "d14a028c2a3a2bc9476102bb288234c415a2b01f",
              },
            }),
            getFakePull({
              number: 2,
              created_at: "2022-09-21T00:00:00Z",
              merged_at: "2022-09-30T00:00:00Z",
              head: {
                "label": "owner:another-branch-name",
                "ref": "another-branch-name",
                "sha": "d14a028c2a3a2bc9476102bb288234c415a2b01f",
              },
            }),
          ],
          syncInfos: [getFakeSyncInfo({
            createdAt: new Date("2022-01-01T00:00:00Z").getTime(),
            updatedAt: new Date("2022-01-01T00:00:00Z").getTime(),
          })],
        });

        assertObjectMatch(
          await single(yieldPullRequestLeadTime(github, { mode: "daily", excludeBranches: ["branch-name"] })),
          {
            start: new Date("2022-09-30T00:00:00.000Z"),
            end: new Date("2022-09-30T23:59:59.999Z"),
            leadTime: 864_000_000,
            mergedPRs: [2],
          },
        );

        assertEquals(
          await asyncToArray(yieldPullRequestLeadTime(github, { mode: "daily", excludeBranches: [/.*branch.*/] })),
          [],
        );

        assertObjectMatch(
          await single(
            yieldPullRequestLeadTime(github, { mode: "daily", includeBranches: ["branch-name"] }),
          ),
          {
            start: new Date("2022-01-05T00:00:00.000Z"),
            end: new Date("2022-01-05T23:59:59.999Z"),
            leadTime: 432_000_000,
            mergedPRs: [1],
          },
        );

        assertObjectMatch(
          await single(
            yieldPullRequestLeadTime(github, { mode: "daily", includeBranches: [/^branch.*/] }),
          ),
          {
            start: new Date("2022-01-05T00:00:00.000Z"),
            end: new Date("2022-01-05T23:59:59.999Z"),
            leadTime: 432_000_000,
            mergedPRs: [1],
          },
        );
      },
    );

    await t.step(
      "calculates multiple sets of multiple merged PRs",
      async () => {
        const github = await createFakeReadonlyGithubClient({
          pulls: [
            getFakePull({
              number: 1,
              created_at: "2022-01-01T00:00:00Z",
              merged_at: "2022-01-05T00:00:00Z",
            }),
            getFakePull({
              number: 2,
              created_at: "2022-01-01T00:00:00Z",
              merged_at: "2022-01-05T23:59:59Z",
            }),

            getFakePull({
              number: 3,
              created_at: "2022-02-01T00:00:00Z",
              merged_at: "2022-02-05T00:00:00Z",
            }),
            getFakePull({
              number: 4,
              created_at: "2022-02-01T00:00:00Z",
              merged_at: "2022-02-05T12:00:00Z",
            }),
            getFakePull({
              number: 5,
              created_at: "2022-02-01T23:59:59Z",
              merged_at: "2022-02-05T23:59:59Z",
            }),
          ],
          syncInfos: [getFakeSyncInfo({
            createdAt: new Date("2022-01-01T00:00:00Z").getTime(),
            updatedAt: new Date("2022-01-01T00:00:00Z").getTime(),
          })],
        });

        assertEquals(
          await asyncToArray(
            yieldPullRequestLeadTime(github, { mode: "daily" }),
          ),
          [
            {
              start: new Date("2022-01-05T00:00:00.000Z"),
              end: new Date("2022-01-05T23:59:59.999Z"),
              leadTime: 432_000_000,
              timeToMerge: undefined,
              mergedPRs: [1, 2],
            },
            {
              start: new Date("2022-02-05T00:00:00.000Z"),
              end: new Date("2022-02-05T23:59:59.999Z"),
              leadTime: 432_000_000,
              timeToMerge: undefined,
              mergedPRs: [3, 4, 5],
            },
          ],
        );
      },
    );

    await t.step("calculates an average lead time", async () => {
      const github = await createFakeReadonlyGithubClient({
        pulls: [
          getFakePull({
            number: 1,
            created_at: "2022-01-01T00:00:00Z",
            merged_at: "2022-01-20T00:10:00Z",
          }),
          getFakePull({
            number: 2,
            created_at: "2022-01-09T00:00:00Z",
            merged_at: "2022-01-20T12:00:00Z",
          }),
          getFakePull({
            number: 3,
            created_at: "2022-01-20T00:00:00Z",
            merged_at: "2022-01-20T23:59:59.999Z",
          }),
        ],
        syncInfos: [getFakeSyncInfo({
          createdAt: new Date("2022-01-01T00:00:00Z").getTime(),
          updatedAt: new Date("2022-01-01T00:00:00Z").getTime(),
        })],
      });

      assertObjectMatch(
        await single(yieldPullRequestLeadTime(github, { mode: "daily" })),
        {
          start: new Date("2022-01-20T00:00:00.000Z"),
          end: new Date("2022-01-20T23:59:59.999Z"),
          leadTime: 950_400_000,
          mergedPRs: [1, 2, 3],
        },
      );
    });
  });

  await t.step("for weekly lead times", async (t) => {
    await t.step("creates weekly buckets", async () => {
      const github = await createFakeReadonlyGithubClient({
        pulls: [
          getFakePull({
            number: 1,
            created_at: "2022-01-01T00:00:00Z",
            merged_at: "2022-01-05T00:00:00Z",
          }),
          getFakePull({
            number: 2,
            created_at: "2022-01-01T00:00:00Z",
            merged_at: "2022-01-10T00:00:00Z",
          }),
        ],
        syncInfos: [getFakeSyncInfo({
          createdAt: new Date("2022-01-01T00:00:00Z").getTime(),
          updatedAt: new Date("2022-01-01T00:00:00Z").getTime(),
        })],
      });

      assertEquals(
        await asyncToArray(
          yieldPullRequestLeadTime(github, { mode: "weekly" }),
        ),
        [
          {
            start: new Date("2022-01-03T00:00:00.000Z"),
            end: new Date("2022-01-09T23:59:59.999Z"),
            leadTime: 432_000_000,
            timeToMerge: undefined,
            mergedPRs: [1],
          },
          {
            start: new Date("2022-01-10T00:00:00.000Z"),
            end: new Date("2022-01-16T23:59:59.999Z"),
            leadTime: 864_000_000,
            timeToMerge: undefined,
            mergedPRs: [2],
          },
        ],
      );
    });
  });

  await t.step("for monthly lead times", async (t) => {
    await t.step("creates monthly buckets", async () => {
      const github = await createFakeReadonlyGithubClient({
        pulls: [
          getFakePull({
            number: 1,
            created_at: "2022-01-01T00:00:00Z",
            merged_at: "2022-01-05T00:00:00Z",
          }),
          getFakePull({
            number: 2,
            created_at: "2022-01-23T00:00:00Z",
            merged_at: "2022-02-01T00:00:00Z",
          }),
        ],
        syncInfos: [getFakeSyncInfo({
          createdAt: new Date("2022-01-01T00:00:00Z").getTime(),
          updatedAt: new Date("2022-01-01T00:00:00Z").getTime(),
        })],
      });

      assertEquals(
        await asyncToArray(
          yieldPullRequestLeadTime(github, { mode: "monthly" }),
        ),
        [
          {
            start: new Date("2022-01-01T00:00:00.000Z"),
            end: new Date("2022-01-31T23:59:59.999Z"),
            leadTime: 432_000_000,
            timeToMerge: undefined,
            mergedPRs: [1],
          },
          {
            start: new Date("2022-02-01T00:00:00.000Z"),
            end: new Date("2022-02-28T23:59:59.999Z"),
            leadTime: 864_000_000,
            timeToMerge: undefined,
            mergedPRs: [2],
          },
        ],
      );
    });
  });
});
