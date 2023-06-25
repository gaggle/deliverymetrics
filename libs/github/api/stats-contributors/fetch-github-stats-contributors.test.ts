import { assertEquals, assertRejects } from "dev:asserts"

import { CannedResponses, withMockedFetch } from "../../../dev-utils.ts"

import { fetchGithubStatsContributors } from "./fetch-github-stats-contributors.ts"
import { getFakeGithubStatsContributor } from "./get-fake-github-stats-contributor.ts"
import { asyncToArray } from "../../../utils/utils.ts"
import { EnrichedZodError } from "../../../utils/zod-helpers/errors.ts"

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

  await t.step("retries if schema doesn't fit", async () => {
    await withMockedFetch(async (mf) => {
      const statsContributor = getFakeGithubStatsContributor()
      const can = new CannedResponses([
        new Response(JSON.stringify({}), { status: 200, headers }),
        new Response(JSON.stringify([statsContributor]), { status: 200, headers }),
      ])
      mf("GET@/repos/owner/repo/stats/contributors", (...args) => can.fetch(...args))

      const result = await asyncToArray(fetchGithubStatsContributors("owner", "repo", "token"))

      assertEquals(result, [statsContributor])
    })
  })

  await t.step("gives up if retrying doesn't work", async () => {
    await withMockedFetch(async (mf) => {
      let fetchAttempts = 0
      mf("GET@/repos/owner/repo/stats/contributors", () => {
        fetchAttempts++
        return new Response(JSON.stringify({}), { status: 200, headers })
      })

      await assertRejects(
        () => asyncToArray(fetchGithubStatsContributors("owner", "repo", "token")),
        EnrichedZodError,
        "Validation error: Expected array, received object",
      )
      assertEquals(fetchAttempts, 4)
    })
  })

  await t.step("fetches exhaustively", async () => {
    await withMockedFetch(async (mf) => {
      const urlPath = "/repos/owner/repo/stats/contributors"
      let fetches = 0
      const lastPage = 3
      const statsContributor = getFakeGithubStatsContributor()
      mf(`GET@${urlPath}`, () => {
        let link = fetches < lastPage ? `<https://x${urlPath}?page=${fetches + 1}>; rel="next"` : ""
        link += `, <https://x${urlPath}?page=${lastPage}>; rel="last"`
        fetches++
        return new Response(JSON.stringify([statsContributor]), { status: 200, headers: { ...headers, link } })
      })

      await asyncToArray(fetchGithubStatsContributors("owner", "repo", "token"))

      assertEquals(fetches, 4)
      // ↑ First fetch, plus one for each subsequent page
    })
  })
})
