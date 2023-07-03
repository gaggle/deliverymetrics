import { assertEquals, assertInstanceOf } from "dev:asserts"
import { stub } from "dev:mock"

import { arrayToAsyncGenerator, asyncToArray } from "../../../utils/mod.ts"
import { fetchExhaustively2 } from "../../../fetching2/mod.ts"

import { extractCallArgsFromStub, withMockedFetch, withStubs } from "../../../dev-utils.ts"

import { getFakeGithubPull } from "../../api/pulls/mod.ts"

import { githubRestSpec } from "../github-rest-api-spec.ts"

import { _internals, fetchGithubPulls } from "./fetch-github-pulls.ts"

Deno.test("fetchPulls", async (t) => {
  await t.step("calls fetchExhaustively2 with schema", async () => {
    const pull = getFakeGithubPull()
    await withMockedFetch(async () => {
      await withStubs(
        async (fetchExhaustivelyStub) => {
          await asyncToArray(fetchGithubPulls("owner", "repo", "token"))

          const [, schema] = extractCallArgsFromStub<typeof fetchExhaustively2>(fetchExhaustivelyStub, 0, {
            expectedCalls: 1,
            expectedArgs: 2,
          })
          assertEquals(schema, githubRestSpec.pulls.schema)
        },
        stub(
          _internals,
          "fetchExhaustively2",
          () => arrayToAsyncGenerator([{ response: new Response(), data: [pull] }]),
        ),
      )
    })
  })

  await t.step("calls fetchExhaustively2 with expected query params & headers", async () => {
    const pull = getFakeGithubPull()
    await withMockedFetch(async () => {
      await withStubs(
        async (fetchExhaustivelyStub) => {
          await asyncToArray(fetchGithubPulls("owner", "repo", "token"))

          const [req] = extractCallArgsFromStub<typeof fetchExhaustively2>(fetchExhaustivelyStub, 0, {
            expectedCalls: 1,
            expectedArgs: 2,
          })
          assertInstanceOf(req, Request)

          assertEquals(req.method, "GET")
          assertEquals(req.url, "https://api.github.com/repos/owner/repo/pulls?state=all&sort=updated&direction=desc")

          assertEquals(Array.from(req.headers.entries()), [
            ["accept", "Accept: application/vnd.github.v3+json"],
            ["authorization", "Bearer token"],
            ["content-type", "application/json"],
          ])
        },
        stub(
          _internals,
          "fetchExhaustively2",
          () => arrayToAsyncGenerator([{ response: new Response(), data: [pull] }]),
        ),
      )
    })
  })

  await t.step("should yield the pulls that get fetched", async () => {
    const pull = getFakeGithubPull()
    await withMockedFetch(async () => {
      await withStubs(
        async () => {
          const result = await asyncToArray(fetchGithubPulls("owner", "repo", "token"))

          assertEquals(result, [pull])
        },
        stub(
          _internals,
          "fetchExhaustively2",
          () => arrayToAsyncGenerator([{ response: new Response(), data: [pull] }]),
        ),
      )
    })
  })

  await t.step(
    "should stop yielding when passing over an element older than `from`",
    async () => {
      const pull1 = getFakeGithubPull({
        id: 3,
        number: 3,
        updated_at: "2000-01-01T00:00:00Z",
      })
      const pull2 = getFakeGithubPull({
        id: 2,
        number: 2,
        updated_at: "1990-01-01T00:00:00Z",
      })
      const pull3 = getFakeGithubPull({
        id: 1,
        number: 1,
        updated_at: "1980-01-01T00:00:00Z",
      })

      await withStubs(
        async () => {
          assertEquals(
            await asyncToArray(fetchGithubPulls("owner", "repo", "token", {
              newerThan: new Date("1990-01-01T00:00:00Z").getTime(),
            })),
            [pull1, pull2],
          )

          assertEquals(
            await asyncToArray(fetchGithubPulls("owner", "repo", "token", {
              newerThan: new Date("1990-01-01T00:00:01Z").getTime(),
            })),
            [pull1],
          )
        },
        stub(
          _internals,
          "fetchExhaustively2",
          () => arrayToAsyncGenerator([{ response: new Response(), data: [pull1, pull2, pull3] }]),
        ),
      )
    },
  )
})
