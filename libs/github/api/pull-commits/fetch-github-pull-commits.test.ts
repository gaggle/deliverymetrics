import { assertEquals, assertInstanceOf } from "dev:asserts"
import { stub } from "dev:mock"

import { arrayToAsyncGenerator, asyncToArray } from "../../../../utils/mod.ts"
import { extractCallArgsFromStub, withMockedFetch, withStubs } from "../../../../utils/dev-utils.ts"

import { getFakeGithubPull } from "../pulls/mod.ts"

import { fetchGithubApiExhaustively } from "../fetch-github-api-exhaustively.ts"

import { _internals, fetchGithubPullCommits } from "./fetch-github-pull-commits.ts"
import { getFakeGithubPullCommit } from "./get-fake-github-pull-commit.ts"
import { githubPullCommitRestApiSpec } from "./github-pull-commit-rest-api-spec.ts"

Deno.test("fetchPullCommits", async (t) => {
  await t.step("calls fetchExhaustively with schema", async () => {
    const pull = getFakeGithubPull()
    const pullCommit = getFakeGithubPullCommit()
    await withMockedFetch(async () => {
      await withStubs(
        async (fetchExhaustivelyStub) => {
          await asyncToArray(fetchGithubPullCommits(pull, "token"))

          const [, schema] = extractCallArgsFromStub<typeof fetchGithubApiExhaustively>(fetchExhaustivelyStub, 0, {
            expectedCalls: 1,
            expectedArgs: 3,
          })
          assertEquals(schema, githubPullCommitRestApiSpec.schema)
        },
        stub(
          _internals,
          "fetchGithubApiExhaustively",
          () => arrayToAsyncGenerator([{ response: new Response(), data: [pullCommit] }]),
        ),
      )
    })
  })

  await t.step("calls fetchExhaustively with expected query params & headers", async () => {
    const pull = getFakeGithubPull({
      number: 100,
      commits_url: "https://api.github.com/repos/octocat/Hello-World/pulls/100/commits",
    })
    const pullCommit = getFakeGithubPullCommit()
    await withMockedFetch(async () => {
      await withStubs(
        async (fetchExhaustivelyStub) => {
          await asyncToArray(fetchGithubPullCommits(pull, "token"))

          const [req] = extractCallArgsFromStub<typeof fetchGithubApiExhaustively>(fetchExhaustivelyStub, 0, {
            expectedCalls: 1,
            expectedArgs: 3,
          })
          assertInstanceOf(req, Request)

          assertEquals(req.method, "GET")
          assertEquals(req.url, "https://api.github.com/repos/octocat/Hello-World/pulls/100/commits")

          assertEquals(Array.from(req.headers.entries()), [
            ["accept", "Accept: application/vnd.github.v3+json"],
            ["authorization", "Bearer token"],
            ["content-type", "application/json"],
          ])
        },
        stub(
          _internals,
          "fetchGithubApiExhaustively",
          () => arrayToAsyncGenerator([{ response: new Response(), data: [pullCommit] }]),
        ),
      )
    })
  })

  await t.step("should yield what gets fetched", async () => {
    const pull = getFakeGithubPull()
    const pullCommit = getFakeGithubPullCommit()
    await withMockedFetch(async () => {
      await withStubs(
        async () => {
          const result = await asyncToArray(fetchGithubPullCommits(pull, "token"))

          assertEquals(result, [pullCommit])
        },
        stub(
          _internals,
          "fetchGithubApiExhaustively",
          () => arrayToAsyncGenerator([{ response: new Response(), data: [pullCommit] }]),
        ),
      )
    })
  })
})
