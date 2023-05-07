import { assertEquals } from "dev:asserts"
import { assertSpyCalls, returnsNext, spy } from "dev:mock"

import { asyncToArray } from "../../utils/mod.ts"

import { getFakeCommit } from "../testing/mod.ts"

import { fetchCommits } from "./fetch-commits.ts"

Deno.test("fetchCommits", async (t) => {
  await t.step("should fetch commits from GitHub API", async () => {
    const fetchLike = spy(returnsNext([Promise.resolve(
      new Response(JSON.stringify([getFakeCommit()]), {
        status: 200,
        statusText: "OK",
      }),
    )]))

    await asyncToArray(fetchCommits("owner", "repo", "token", { fetchLike }))

    assertSpyCalls(fetchLike, 1)
    const request = fetchLike.calls[0].args["0"] as Request
    assertEquals(request.method, "GET")
    assertEquals(
      request.url,
      "https://api.github.com/repos/owner/repo/commits",
    )
    assertEquals(Array.from(request.headers.entries()), [
      ["accept", "Accept: application/vnd.github.v3+json"],
      ["authorization", "Bearer token"],
      ["content-type", "application/json"],
    ])
  })

  await t.step("should yield the commits that get fetched", async () => {
    const fetchLike = spy(returnsNext([Promise.resolve(
      new Response(JSON.stringify([getFakeCommit()]), {
        status: 200,
        statusText: "OK",
      }),
    )]))

    const res = await asyncToArray(fetchCommits("owner", "repo", "token", { fetchLike }))

    assertEquals(res, [getFakeCommit()])
  })

  await t.step("should use Link header to fetch exhaustively", async () => {
    const fetchLike = spy(returnsNext([
      Promise.resolve(
        new Response(JSON.stringify([getFakeCommit({ sha: "1" })]), {
          status: 200,
          statusText: "OK",
          headers: new Headers({
            link:
              '<https://api.github.com/repositories/1/commits?page=2>; rel="next", <https://api.github.com/repositories/1/commits?page=10>; rel="last"',
          }),
        }),
      ),
      Promise.resolve(
        new Response(JSON.stringify([getFakeCommit({ sha: "2" })]), {
          status: 200,
          statusText: "OK",
          headers: new Headers({
            link:
              '<https://api.github.com/repositories/1/commits?page=3>; rel="next", <https://api.github.com/repositories/1/commits?page=10>; rel="last"',
          }),
        }),
      ),
      Promise.resolve(
        new Response(JSON.stringify([getFakeCommit({ sha: "3" })]), {
          status: 200,
          statusText: "OK",
        }),
      ),
    ]))
    await asyncToArray(fetchCommits("owner", "repo", "token", { fetchLike }))

    assertSpyCalls(fetchLike, 3)
    // ↑ Called thrice because it fetches pages 2 & 3
    assertEquals(
      fetchLike.calls[0].args["0"].url,
      "https://api.github.com/repos/owner/repo/commits",
    )
    assertEquals(
      fetchLike.calls[1].args["0"].url,
      "https://api.github.com/repositories/1/commits?page=2",
    )
    assertEquals(
      fetchLike.calls[2].args["0"].url,
      "https://api.github.com/repositories/1/commits?page=3",
    )
  })

  await t.step(
    "should only fetch newer than `from`",
    async () => {
      const fetchLike = spy(returnsNext([Promise.resolve(
        new Response(JSON.stringify([getFakeCommit()]), {
          status: 200,
          statusText: "OK",
        }),
      )]))

      await asyncToArray(
        fetchCommits("owner", "repo", "token", { fetchLike, newerThan: new Date("1981-01-01T00:00:00Z").getTime() }),
      )

      assertSpyCalls(fetchLike, 1)
      const request = fetchLike.calls[0].args["0"] as Request
      assertEquals(request.method, "GET")
      assertEquals(
        request.url,
        `https://api.github.com/repos/owner/repo/commits?since=${encodeURIComponent("1981-01-01T00:00:00Z")}`,
      )
      assertEquals(Array.from(request.headers.entries()), [
        ["accept", "Accept: application/vnd.github.v3+json"],
        ["authorization", "Bearer token"],
        ["content-type", "application/json"],
      ])
    },
  )
})
