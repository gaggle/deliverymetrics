import { assertEquals, assertRejects } from "dev:asserts"
import { assertSpyCalls, returnsNext, stub } from "dev:mock"

import { Retrier } from "../../fetching/mod.ts"

import { asyncToArray } from "../../utils/mod.ts"
import { withStubs } from "../../dev-utils.ts"

import { getFakePull } from "../testing.ts"
import { fetchPulls } from "./fetch-pulls.ts"

Deno.test("fetchPulls", async (t) => {
  await t.step("should call fetch to get pulls from GitHub API", async () => {
    const retrier = new Retrier()
    await withStubs(
      async (stub) => {
        await asyncToArray(fetchPulls("owner", "repo", "token", { retrier }))

        assertSpyCalls(stub, 1)
        const request = stub.calls[0].args["0"] as Request
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
      },
      stub(
        retrier,
        "fetch",
        returnsNext([Promise.resolve(
          new Response(JSON.stringify([getFakePull()]), {
            status: 200,
            statusText: "OK",
          }),
        )]),
      ),
    )
  })

  await t.step("should yield the pulls that get fetched", async () => {
    const retrier = new Retrier()
    await withStubs(
      async () => {
        const res = await asyncToArray(
          fetchPulls("owner", "repo", "token", { retrier }),
        )
        assertEquals(res, [getFakePull()])
      },
      stub(
        retrier,
        "fetch",
        returnsNext([Promise.resolve(
          new Response(JSON.stringify([getFakePull()]), {
            status: 200,
            statusText: "OK",
          }),
        )]),
      ),
    )
  })

  await t.step("should use Link header to fetch exhaustively", async () => {
    const retrier = new Retrier()
    await withStubs(
      async (stub) => {
        await asyncToArray(fetchPulls("owner", "repo", "token", { retrier }))

        assertSpyCalls(stub, 3)
        // ↑ Called thrice because it fetches pages 2 & 3
        assertEquals(
          stub.calls[0].args["0"].url,
          "https://api.github.com/repos/owner/repo/pulls?state=all&sort=updated&direction=desc",
        )
        assertEquals(
          stub.calls[1].args["0"].url,
          "https://api.github.com/repositories/1/pulls?state=all&page=2",
        )
        assertEquals(
          stub.calls[2].args["0"].url,
          "https://api.github.com/repositories/1/pulls?state=all&page=3",
        )
      },
      stub(
        retrier,
        "fetch",
        returnsNext([
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
        ]),
      ),
    )
  })

  await t.step(
    "should stop exhaustively fetching when passing over an element older than `from`",
    async () => {
      const retrier = new Retrier()
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
      await withStubs(
        async (stub) => {
          const res = await asyncToArray(fetchPulls("owner", "repo", "token", {
            from: new Date("1995-01-01T00:00:00Z").getTime(),
            retrier,
          }))

          assertSpyCalls(stub, 1)
          assertEquals(
            stub.calls[0].args["0"].url,
            "https://api.github.com/repos/owner/repo/pulls?state=all&sort=updated&direction=desc",
          )
          assertEquals(res, [pull1])
        },
        stub(
          retrier,
          "fetch",
          returnsNext([
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
          ]),
        ),
      )
    },
  )

  await t.step(
    "should ignore a page if its content is older than `from`",
    async () => {
      const retrier = new Retrier()
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
      await withStubs(
        async (stub) => {
          const res = await asyncToArray(fetchPulls("owner", "repo", "token", {
            from: new Date("1995-01-01T00:00:00Z").getTime(),
            retrier,
          }))

          assertSpyCalls(stub, 2)
          // ↑ Called twice because the last page sits after a pull older than `from`
          assertEquals(
            stub.calls[0].args["0"].url,
            "https://api.github.com/repos/owner/repo/pulls?state=all&sort=updated&direction=desc",
          )
          assertEquals(
            stub.calls[1].args["0"].url,
            "https://api.github.com/repositories/1/pulls?state=all&page=2",
          )
          assertEquals(res, [pull1])
          // ↑ Even though it called fetch twice there's only one pull, because the pull on page
        },
        stub(
          retrier,
          "fetch",
          returnsNext([
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
          ]),
        ),
      )
    },
  )

  await t.step("should throw an error if fetch isn't ok", async () => {
    const retrier = new Retrier()
    await withStubs(
      async () => {
        await assertRejects(
          () => asyncToArray(fetchPulls("owner", "repo", "token", { retrier })),
          Error,
          "Could not fetch https://api.github.com/repos/owner/repo/pulls?state=all&sort=updated&direction=desc, got 404 Not Found: Some error",
        )
      },
      stub(
        retrier,
        "fetch",
        returnsNext([Promise.resolve(
          new Response("Some error", { status: 404, statusText: "Not Found" }),
        )]),
      ),
    )
  })
})
