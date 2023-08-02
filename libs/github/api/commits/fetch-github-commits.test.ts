import { assertEquals, assertInstanceOf } from "dev:asserts"
import { stub } from "dev:mock"

import { arrayToAsyncGenerator, asyncToArray } from "../../../utils/mod.ts"

import { extractCallArgsFromStub, withMockedFetch, withStubs } from "../../../../utils/dev-utils.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"
import { githubRestSpec } from "../github-rest-api-spec.ts"

import { _internals, fetchGithubCommits } from "./fetch-github-commits.ts"
import { getFakeGithubCommit } from "./get-fake-github-commit.ts"

Deno.test("fetchCommits", async (t) => {
  await t.step("calls fetchExhaustively with schema", async () => {
    const commit = getFakeGithubCommit()
    await withMockedFetch(async () => {
      await withStubs(
        async (fetchExhaustivelyStub) => {
          await asyncToArray(fetchGithubCommits("owner", "repo", "token"))

          const [, schema] = extractCallArgsFromStub<typeof fetchGithubApiExhaustively>(fetchExhaustivelyStub, 0, {
            expectedCalls: 1,
            expectedArgs: 3,
          })
          assertEquals(schema, githubRestSpec.commits.schema)
        },
        stub(
          _internals,
          "fetchGithubApiExhaustively",
          () => arrayToAsyncGenerator([{ response: new Response(), data: [commit] }]),
        ),
      )
    })
  })

  await t.step("calls fetchExhaustively with expected query params & headers", async () => {
    const commit = getFakeGithubCommit()
    await withMockedFetch(async () => {
      await withStubs(
        async (fetchExhaustivelyStub) => {
          await asyncToArray(fetchGithubCommits("octocat", "Hello-World", "token"))

          const [req] = extractCallArgsFromStub<typeof fetchGithubApiExhaustively>(fetchExhaustivelyStub, 0, {
            expectedCalls: 1,
            expectedArgs: 3,
          })
          assertInstanceOf(req, Request)

          assertEquals(req.method, "GET")
          assertEquals(req.url, "https://api.github.com/repos/octocat/Hello-World/commits")

          assertEquals(Array.from(req.headers.entries()), [
            ["accept", "Accept: application/vnd.github.v3+json"],
            ["authorization", "Bearer token"],
            ["content-type", "application/json"],
          ])
        },
        stub(
          _internals,
          "fetchGithubApiExhaustively",
          () => arrayToAsyncGenerator([{ response: new Response(), data: [commit] }]),
        ),
      )
    })
  })

  await t.step("adds newer than to query param", async () => {
    const commit = getFakeGithubCommit()
    await withMockedFetch(async () => {
      await withStubs(
        async (fetchExhaustivelyStub) => {
          await asyncToArray(fetchGithubCommits("octocat", "Hello-World", "token", { newerThan: 10_000 }))

          const [req] = extractCallArgsFromStub<typeof fetchGithubApiExhaustively>(fetchExhaustivelyStub, 0, {
            expectedCalls: 1,
            expectedArgs: 3,
          })
          assertEquals(
            req.url,
            "https://api.github.com/repos/octocat/Hello-World/commits?since=1970-01-01T00%3A00%3A10Z",
          )
        },
        stub(
          _internals,
          "fetchGithubApiExhaustively",
          () => arrayToAsyncGenerator([{ response: new Response(), data: [commit] }]),
        ),
      )
    })
  })

  await t.step("should yield what gets fetched", async () => {
    const commit = getFakeGithubCommit()
    await withMockedFetch(async () => {
      await withStubs(
        async () => {
          const result = await asyncToArray(fetchGithubCommits("owner", "repo", "token"))

          assertEquals(result, [commit])
        },
        stub(
          _internals,
          "fetchGithubApiExhaustively",
          () => arrayToAsyncGenerator([{ response: new Response(), data: [commit] }]),
        ),
      )
    })
  })
})
