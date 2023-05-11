import { assertEquals } from "dev:asserts"

import { withMockedFetch } from "../../../dev-utils.ts"

import { fetchGithubStatsContributors } from "./fetch-github-stats-contributors.ts"
import { getFakeGithubStatsContributor } from "./get-fake-github-stats-contributor.ts"

Deno.test("fetch-github-stats-contributors", async (t) => {
  await t.step("calls API stats/contributors endpoint", async () => {
    await withMockedFetch(async (mf) => {
      const statsContributor = getFakeGithubStatsContributor()
      mf(
        "GET@/repos/owner/repo/stats/contributors",
        () => new Response(JSON.stringify([statsContributor]), { status: 200 }),
      )
      const result: unknown[] = []
      for await (const el of fetchGithubStatsContributors("owner", "repo", "token")) {
        result.push(el)
      }
      assertEquals(result, [statsContributor])
    })
  })
})
