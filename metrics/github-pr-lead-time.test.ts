import { asserts } from "../dev-deps.ts";

import { yieldDailyPullRequestLeadTime } from "./github-pr-lead-time.ts";
import { GithubMockCache, ReadonlyGithubClient } from "../github/mod.ts";
import { getFakePull } from "../github/testing.ts";
import { asyncToArray } from "../utils.ts";

Deno.test("yieldDailyPullRequestLeadTime", async (t) => {
  await t.step("calculates a trivial case of a single merged PR", async () => {
    const github = new ReadonlyGithubClient({
      cache: new GithubMockCache({
        pulls: [
          getFakePull({ number: 1, created_at: "2022-01-01T00:00:00Z", merged_at: "2022-01-05T00:00:00Z" }),
        ]
      }), owner: "owner", repo: "repo"
    });

    asserts.assertEquals(await asyncToArray(yieldDailyPullRequestLeadTime(github)), [
      { day: "2022-01-05T00:00:00.000Z", leadTimeInDays: 5.0, mergedPRs: [1] },
    ]);
  });

  await t.step("calculates multiple sets of multiple merged PRs", async () => {
    const github = new ReadonlyGithubClient({
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

    asserts.assertEquals(await asyncToArray(yieldDailyPullRequestLeadTime(github)), [
      { day: "2022-01-05T00:00:00.000Z", leadTimeInDays: 5.0, mergedPRs: [1, 2] },
      { day: "2022-02-05T00:00:00.000Z", leadTimeInDays: 5.0, mergedPRs: [3, 4, 5] },
    ]);
  });

  await t.step("calculates an average lead time", async () => {
    const github = new ReadonlyGithubClient({
      cache: new GithubMockCache({
        pulls: [
          getFakePull({ number: 1, created_at: "2022-01-01T00:00:00Z", merged_at: "2022-01-20T00:10:00Z" }),
          getFakePull({ number: 2, created_at: "2022-01-09T00:00:00Z", merged_at: "2022-01-20T12:00:00Z" }),
          getFakePull({ number: 3, created_at: "2022-01-20T00:00:00Z", merged_at: "2022-01-20T23:59:59.999Z" }),
        ]
      }), owner: "owner", repo: "repo"
    });

    asserts.assertEquals(await asyncToArray(yieldDailyPullRequestLeadTime(github)), [
      { day: "2022-01-20T00:00:00.000Z", leadTimeInDays: 11.0, mergedPRs: [1, 2, 3] },
    ]);
  });
});
