import { assertEquals, assertInstanceOf } from "dev:asserts"
import { stub } from "dev:mock"

import { arrayToAsyncGenerator, asyncToArray } from "../../../../utils/mod.ts"
import { extractCallArgsFromStub, withMockedFetch, withStubs } from "../../../../utils/dev-utils.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"

import { _internals, fetchGithubStatsContributors } from "./fetch-github-stats-contributors.ts"
import { getFakeGithubStatsContributor } from "./get-fake-github-stats-contributor.ts"
import { githubStatsContributorRestApiSpec } from "./github-stats-contributor-rest-api-spec.ts"

Deno.test("fetch-github-stats-contributors", async (t) => {
  const headers = { "Content-Type": "application/json" }

  await t.step("calls API stats/contributors endpoint", async () => {
    await withMockedFetch(async (mf) => {
      const statsContributor = getFakeGithubStatsContributor()
      mf(
        "GET@/repos/owner/repo/stats/contributors",
        () => new Response(JSON.stringify([statsContributor]), { status: 200, headers }),
      )

      const result = await asyncToArray(fetchGithubStatsContributors("owner", "repo", "token"))

      assertEquals(result, [statsContributor])
    })
  })

  await t.step("calls fetchExhaustively with stats-contributors schema", async () => {
    await withMockedFetch(async () => {
      const statsContributor = getFakeGithubStatsContributor()
      await withStubs(
        async (fetchExhaustivelyStub) => {
          await asyncToArray(fetchGithubStatsContributors("owner", "repo", "token"))

          const [req, schema, opts] = extractCallArgsFromStub<typeof fetchGithubApiExhaustively>(
            fetchExhaustivelyStub,
            0,
            {
              expectedCalls: 1,
              expectedArgs: 3,
            },
          )
          assertInstanceOf(req, Request)
          assertEquals(schema, githubStatsContributorRestApiSpec.schema)
          assertEquals(opts, { retryStrategy: "github-backoff", maxRetries: 20, signal: undefined })
        },
        stub(
          _internals,
          "fetchGithubApiExhaustively",
          () => arrayToAsyncGenerator([{ response: new Response(), data: [statsContributor] }]),
        ),
      )
    })
  })
})
