import { assertEquals, assertRejects } from "dev:asserts"
import { assertSpyCalls, returnsNext, spy } from "dev:mock"

import { asyncToArray } from "../../utils/mod.ts"

import { getFakePullCommit } from "../testing.ts"

import { fetchPullCommits } from "./fetch-pull-commits.ts"

Deno.test("fetchPullCommits", async (t) => {
  await t.step("should call fetch to get pull-commits from GitHub API", async () => {
    const fetchLike = spy(returnsNext([Promise.resolve(
      new Response(JSON.stringify([getFakePullCommit()]), {
        status: 200,
        statusText: "OK",
      }),
    )]))

    await asyncToArray(fetchPullCommits({ commits_url: "https://foo" }, "token", { fetchLike }))

    assertSpyCalls(fetchLike, 1)
    const request = fetchLike.calls[0].args["0"] as Request
    assertEquals(request.method, "GET")
    assertEquals(request.url, "https://foo/")
    assertEquals(Array.from(request.headers.entries()), [
      ["accept", "Accept: application/vnd.github.v3+json"],
      ["authorization", "Bearer token"],
      ["content-type", "application/json"],
    ])
  })

  await t.step("should yield the pulls that get fetched", async () => {
    const fetchLike = spy(returnsNext([Promise.resolve(
      new Response(JSON.stringify([getFakePullCommit()]), {
        status: 200,
        statusText: "OK",
      }),
    )]))

    const res = await asyncToArray(fetchPullCommits({ commits_url: "https://foo" }, "token", { fetchLike }))

    assertEquals(res, [getFakePullCommit()])
  })

  await t.step("should use Link header to fetch exhaustively", async () => {
    const fetchLike = spy(returnsNext([
      Promise.resolve(
        new Response(JSON.stringify([getFakePullCommit({ commit: { message: "message 1" } })]), {
          status: 200,
          statusText: "OK",
          headers: new Headers({
            link: '<https://foo?page=2>; rel="next", <https://foo?page=3>; rel="last"',
          }),
        }),
      ),
      Promise.resolve(
        new Response(JSON.stringify([getFakePullCommit({ commit: { message: "message 2" } })]), {
          status: 200,
          statusText: "OK",
          headers: new Headers({
            link: '<https://foo?page=3>; rel="next", <https://foo?page=3>; rel="last"',
          }),
        }),
      ),
      Promise.resolve(
        new Response(JSON.stringify([getFakePullCommit({ commit: { message: "message 3" } })]), {
          status: 200,
          statusText: "OK",
        }),
      ),
    ]))

    await asyncToArray(fetchPullCommits({ commits_url: "https://foo" }, "token", { fetchLike }))

    assertSpyCalls(fetchLike, 3)
    // ↑ Called thrice because it fetches pages 2 & 3
    assertEquals(
      fetchLike.calls[0].args["0"].url,
      "https://foo/",
    )
    assertEquals(
      fetchLike.calls[1].args["0"].url,
      "https://foo/?page=2",
    )
    assertEquals(
      fetchLike.calls[2].args["0"].url,
      "https://foo/?page=3",
    )
  })

  await t.step("should throw an error if fetch isn't ok", async () => {
    const fetchLike = spy(returnsNext([Promise.resolve(
      new Response("Some error", { status: 404, statusText: "Not Found" }),
    )]))

    await assertRejects(
      () => asyncToArray(fetchPullCommits({ commits_url: "https://foo" }, "token", { fetchLike })),
      Error,
      "404 Not Found (https://foo/): Some error",
    )
  })
})
