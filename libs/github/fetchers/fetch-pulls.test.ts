import { assertEquals, assertRejects } from "dev:asserts"
import { assertSpyCalls, returnsNext, spy } from "dev:mock"

import { asyncToArray } from "../../utils/mod.ts"

import { getFakePull } from "../testing.ts"

import { fetchPulls } from "./fetch-pulls.ts"

Deno.test("fetchPulls", async (t) => {
  await t.step("should call fetch to get pulls from GitHub API", async () => {
    const fetchLike = spy(returnsNext([Promise.resolve(
      new Response(JSON.stringify([getFakePull()]), {
        status: 200,
        statusText: "OK",
      }),
    )]))

    await asyncToArray(fetchPulls("owner", "repo", "token", { fetchLike }))

    assertSpyCalls(fetchLike, 1)
    const request = fetchLike.calls[0].args["0"] as Request
    assertEquals(request.method, "GET")
    assertEquals(
      request.url,
      "https://api.github.com/repos/owner/repo/pulls?state=all&sort=updated&direction=desc",
    )
    assertEquals(Array.from(request.headers.entries()), [
      ["accept", "Accept: application/vnd.github.v3+json"],
      ["authorization", "Bearer token"],
      ["content-type", "application/json"],
    ])
  })

  await t.step("should yield the pulls that get fetched", async () => {
    const fetchLike = spy(returnsNext([Promise.resolve(
      new Response(JSON.stringify([getFakePull()]), {
        status: 200,
        statusText: "OK",
      }),
    )]))

    const res = await asyncToArray(
      fetchPulls("owner", "repo", "token", { fetchLike }),
    )
    assertEquals(res, [getFakePull()])
  })

  await t.step("should use Link header to fetch exhaustively", async () => {
    const fetchLike = spy(returnsNext([
      Promise.resolve(
        new Response(JSON.stringify([getFakePull({ id: 1, number: 1 })]), {
          status: 200,
          statusText: "OK",
          headers: new Headers({
            link:
              '<https://api.github.com/repositories/1/pulls?state=all&page=2>; rel="next", <https://api.github.com/repositories/1/pulls?state=all&page=3>; rel="last"',
          }),
        }),
      ),
      Promise.resolve(
        new Response(JSON.stringify([getFakePull({ id: 2, number: 2 })]), {
          status: 200,
          statusText: "OK",
          headers: new Headers({
            link:
              '<https://api.github.com/repositories/1/pulls?state=all&page=3>; rel="next", <https://api.github.com/repositories/1/pulls?state=all&page=3>; rel="last"',
          }),
        }),
      ),
      Promise.resolve(
        new Response(JSON.stringify([getFakePull({ id: 3, number: 3 })]), {
          status: 200,
          statusText: "OK",
        }),
      ),
    ]))
    await asyncToArray(fetchPulls("owner", "repo", "token", { fetchLike }))

    assertSpyCalls(fetchLike, 3)
    // ↑ Called thrice because it fetches pages 2 & 3
    assertEquals(
      fetchLike.calls[0].args["0"].url,
      "https://api.github.com/repos/owner/repo/pulls?state=all&sort=updated&direction=desc",
    )
    assertEquals(
      fetchLike.calls[1].args["0"].url,
      "https://api.github.com/repositories/1/pulls?state=all&page=2",
    )
    assertEquals(
      fetchLike.calls[2].args["0"].url,
      "https://api.github.com/repositories/1/pulls?state=all&page=3",
    )
  })

  await t.step(
    "should stop exhaustively fetching when passing over an element older than `from`",
    async () => {
      const pull1 = getFakePull({
        id: 3,
        number: 3,
        updated_at: "2000-01-01T00:00:00Z",
      })
      const pull2 = getFakePull({
        id: 2,
        number: 2,
        updated_at: "1990-01-01T00:00:00Z",
      })
      const pull3 = getFakePull({
        id: 1,
        number: 1,
        updated_at: "1980-01-01T00:00:00Z",
      })
      const fetchLike = spy(returnsNext([
        Promise.resolve(
          new Response(JSON.stringify([pull1, pull2]), {
            status: 200,
            statusText: "OK",
            headers: new Headers({
              link:
                '<https://api.github.com/repositories/1/pulls?state=all&page=2>; rel="next", <https://api.github.com/repositories/1/pulls?state=all&page=2>; rel="last"',
            }),
          }),
        ),
        Promise.resolve(
          new Response(JSON.stringify([pull3]), {
            status: 200,
            statusText: "OK",
          }),
        ),
      ]))

      const res = await asyncToArray(fetchPulls("owner", "repo", "token", {
        newerThan: new Date("1995-01-01T00:00:00Z").getTime(),
        fetchLike,
      }))

      assertSpyCalls(fetchLike, 1)
      assertEquals(
        fetchLike.calls[0].args["0"].url,
        "https://api.github.com/repos/owner/repo/pulls?state=all&sort=updated&direction=desc",
      )
      assertEquals(res, [pull1])
    },
  )

  await t.step(
    "should ignore a page if its content is older than `from`",
    async () => {
      const pull1 = getFakePull({
        id: 3,
        number: 3,
        updated_at: "2000-01-01T00:00:00Z",
      })
      const pull2 = getFakePull({
        id: 2,
        number: 2,
        updated_at: "1990-01-01T00:00:00Z",
      })
      const fetchLike = spy(returnsNext([
        Promise.resolve(
          new Response(JSON.stringify([pull1]), {
            status: 200,
            statusText: "OK",
            headers: new Headers({
              link:
                '<https://api.github.com/repositories/1/pulls?state=all&page=2>; rel="next", <https://api.github.com/repositories/1/pulls?state=all&page=3>; rel="last"',
            }),
          }),
        ),
        Promise.resolve(
          new Response(JSON.stringify([pull2]), {
            status: 200,
            statusText: "OK",
            headers: new Headers({
              link:
                '<https://api.github.com/repositories/1/pulls?state=all&page=3>; rel="next", <https://api.github.com/repositories/1/pulls?state=all&page=3>; rel="last"',
            }),
          }),
        ),
        Promise.resolve(
          new Response("", {
            status: 200,
            statusText: "OK",
          }),
        ),
      ]))

      const res = await asyncToArray(fetchPulls("owner", "repo", "token", {
        newerThan: new Date("1995-01-01T00:00:00Z").getTime(),
        fetchLike,
      }))

      assertSpyCalls(fetchLike, 2)
      // ↑ Called twice because the last page sits after a pull older than `from`
      assertEquals(
        fetchLike.calls[0].args["0"].url,
        "https://api.github.com/repos/owner/repo/pulls?state=all&sort=updated&direction=desc",
      )
      assertEquals(
        fetchLike.calls[1].args["0"].url,
        "https://api.github.com/repositories/1/pulls?state=all&page=2",
      )
      assertEquals(res, [pull1])
      // ↑ Even though it called fetch twice there's only one pull, because the pull on page
    },
  )

  await t.step("should throw an error if fetch isn't ok", async () => {
    const fetchLike = spy(returnsNext([Promise.resolve(
      new Response("Some error", { status: 404, statusText: "Not Found" }),
    )]))
    await assertRejects(
      () => asyncToArray(fetchPulls("owner", "repo", "token", { fetchLike })),
      Error,
      "404 Not Found (https://api.github.com/repos/owner/repo/pulls?state=all&sort=updated&direction=desc): Some error",
    )
  })
})
