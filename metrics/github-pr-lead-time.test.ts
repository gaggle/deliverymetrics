import { asserts } from "../dev-deps.ts";

import { yieldPullRequestLeadTime } from "./github-pr-lead-time.ts";
import { GithubMockCache, ReadonlyDiskGithubClient } from "../github/mod.ts";
import { getFakePull } from "../github/testing.ts";
import { asyncToArray } from "../utils.ts";

Deno.test("yieldPullRequestLeadTime", async (t) => {

  await t.step("for daily lead times", async (t) => {
    await t.step("calculates a trivial case of a single merged PR", async () => {
      const github = new ReadonlyDiskGithubClient({
        cache: new GithubMockCache({
          pulls: [
            getFakePull({ number: 1, created_at: "2022-01-01T00:00:00Z", merged_at: "2022-01-05T00:00:00Z" }),
          ]
        }), owner: "owner", repo: "repo"
      });

      asserts.assertEquals(await asyncToArray(yieldPullRequestLeadTime(github, { mode: "daily" })), [
        {
          start: new Date("2022-01-05T00:00:00.000Z"),
          end: new Date("2022-01-05T23:59:59.999Z"),
          leadTime: 432_000_000,
          mergedPRs: [1]
        },
      ]);
    });

    await t.step("calculates multiple sets of multiple merged PRs", async () => {
      const github = new ReadonlyDiskGithubClient({
        cache: new GithubMockCache({
          pulls: [
            getFakePull({ number: 1, created_at: "2022-01-01T00:00:00Z", merged_at: "2022-01-05T00:00:00Z" }),
            getFakePull({ number: 2, created_at: "2022-01-01T00:00:00Z", merged_at: "2022-01-05T23:59:59Z" }),

            getFakePull({ number: 3, created_at: "2022-02-01T00:00:00Z", merged_at: "2022-02-05T00:00:00Z" }),
            getFakePull({ number: 4, created_at: "2022-02-01T00:00:00Z", merged_at: "2022-02-05T12:00:00Z" }),
            getFakePull({ number: 5, created_at: "2022-02-01T23:59:59Z", merged_at: "2022-02-05T23:59:59Z" }),
          ]
        }), owner: "owner", repo: "repo"
      });

      asserts.assertEquals(await asyncToArray(yieldPullRequestLeadTime(github, { mode: "daily" })), [
        {
          start: new Date("2022-01-05T00:00:00.000Z"),
          end: new Date("2022-01-05T23:59:59.999Z"),
          leadTime: 432_000_000,
          mergedPRs: [1, 2]
        },
        {
          start: new Date("2022-02-05T00:00:00.000Z"),
          end: new Date("2022-02-05T23:59:59.999Z"),
          leadTime: 432_000_000,
          mergedPRs: [3, 4, 5]
        },
      ]);
    });

    await t.step("calculates an average lead time", async () => {
      const github = new ReadonlyDiskGithubClient({
        cache: new GithubMockCache({
          pulls: [
            getFakePull({ number: 1, created_at: "2022-01-01T00:00:00Z", merged_at: "2022-01-20T00:10:00Z" }),
            getFakePull({ number: 2, created_at: "2022-01-09T00:00:00Z", merged_at: "2022-01-20T12:00:00Z" }),
            getFakePull({ number: 3, created_at: "2022-01-20T00:00:00Z", merged_at: "2022-01-20T23:59:59.999Z" }),
          ]
        }), owner: "owner", repo: "repo"
      });

      asserts.assertEquals(await asyncToArray(yieldPullRequestLeadTime(github, { mode: "daily" })), [
        {
          start: new Date("2022-01-20T00:00:00.000Z"),
          end: new Date("2022-01-20T23:59:59.999Z"),
          leadTime: 950_400_000,
          mergedPRs: [1, 2, 3]
        },
      ]);
    });

  });

  await t.step("for weekly lead times", async (t) => {
    await t.step("creates weekly buckets", async () => {
      const github = new ReadonlyDiskGithubClient({
        cache: new GithubMockCache({
          pulls: [
            getFakePull({ number: 1, created_at: "2022-01-01T00:00:00Z", merged_at: "2022-01-05T00:00:00Z" }),
            getFakePull({ number: 2, created_at: "2022-01-01T00:00:00Z", merged_at: "2022-01-10T00:00:00Z" }),
          ]
        }), owner: "owner", repo: "repo"
      });

      asserts.assertEquals(await asyncToArray(yieldPullRequestLeadTime(github, { mode: "weekly" })), [
        {
          start: new Date("2022-01-03T00:00:00.000Z"),
          end: new Date("2022-01-09T23:59:59.999Z"),
          leadTime: 432_000_000,
          mergedPRs: [1]
        },
        {
          start: new Date("2022-01-10T00:00:00.000Z"),
          end: new Date("2022-01-16T23:59:59.999Z"),
          leadTime: 864_000_000,
          mergedPRs: [2]
        },
      ]);
    });
  });

  await t.step("for monthly lead times", async (t) => {
    await t.step("creates monthly buckets", async () => {
      const github = new ReadonlyDiskGithubClient({
        cache: new GithubMockCache({
          pulls: [
            getFakePull({ number: 1, created_at: "2022-01-01T00:00:00Z", merged_at: "2022-01-05T00:00:00Z" }),
            getFakePull({ number: 2, created_at: "2022-01-23T00:00:00Z", merged_at: "2022-02-01T00:00:00Z" }),
          ]
        }), owner: "owner", repo: "repo"
      });

      asserts.assertEquals(await asyncToArray(yieldPullRequestLeadTime(github, { mode: "monthly" })), [
        {
          start: new Date("2022-01-01T00:00:00.000Z"),
          end: new Date("2022-01-31T23:59:59.999Z"),
          leadTime: 432_000_000,
          mergedPRs: [1]
        },
        {
          start: new Date("2022-02-01T00:00:00.000Z"),
          end: new Date("2022-02-28T23:59:59.999Z"),
          leadTime: 864_000_000,
          mergedPRs: [2]
        },
      ]);
    });
  });
});
