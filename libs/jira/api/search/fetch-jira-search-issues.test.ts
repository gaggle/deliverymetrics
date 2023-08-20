import { assertEquals, assertInstanceOf } from "dev:asserts"
import { stub } from "dev:mock"

import { arrayToAsyncGenerator, asyncToArray } from "../../../../utils/mod.ts"
import { extractCallArgsFromStub, withMockedFetch, withStubs } from "../../../../utils/dev-utils.ts"

import { fetchJiraApiExhaustively } from "../fetch-jira-api-exhaustively.ts"
import { getFakeJiraRestSearchResponse } from "../get-fake-rest-api-response.ts"
import { jiraRestSpec } from "../jira-rest-api-spec.ts"

import { _internals, fetchJiraSearchIssues } from "./fetch-jira-search-issues.ts"
import { getFakeJiraIssue } from "./get-fake-jira-issue.ts"

Deno.test("fetchJiraSearchIssues", async (t) => {
  await t.step("when calling fetchJiraApiExhaustively", async (t) => {
    await t.step("passes function that returns expected request", async () => {
      await withMockedFetch(async () => {
        await withStubs(
          async (fetchStub) => {
            await asyncToArray(
              fetchJiraSearchIssues({
                projectKeys: ["PRD"],
                user: "example@atlassian.com",
                token: "token",
                host: "https://example.com",
              }),
            )

            const [fn] = extractCallArgsFromStub<typeof fetchJiraApiExhaustively>(fetchStub, 0, {
              expectedCalls: 1,
              expectedArgs: 3,
            })
            const request = fn()

            assertInstanceOf(request, Request)
            assertEquals(request.url, "https://example.com/rest/api/2/search")
            assertEquals(request.method, "POST")
            assertEquals(await request.json(), {
              expand: ["body", "changelog", "history", "names", "transitions"],
              jql: "project in (PRD) ORDER BY updated desc",
            })
            assertEquals(
              Object.fromEntries(request.headers),
              Object.fromEntries(
                new Headers({
                  "authorization": `Basic ${btoa("example@atlassian.com:token")}`,
                  "content-type": "application/json",
                }),
              ),
            )
          },
          stub(_internals, "fetchJiraApiExhaustively", () =>
            arrayToAsyncGenerator([{
              response: new Response(),
              data: getFakeJiraRestSearchResponse({ issues: [getFakeJiraIssue()] }),
            }])),
        )
      })
    })

    await t.step("passes along schema", async () => {
      await withMockedFetch(async () => {
        await withStubs(
          async (fetchStub) => {
            await asyncToArray(
              fetchJiraSearchIssues({
                projectKeys: ["PRD"],
                user: "example@atlassian.com",
                token: "token",
                host: "example.com",
              }),
            )

            const [, schema] = extractCallArgsFromStub<typeof fetchJiraApiExhaustively>(fetchStub, 0, {
              expectedCalls: 1,
              expectedArgs: 3,
            })
            assertEquals(schema, jiraRestSpec.search.schema)
          },
          stub(_internals, "fetchJiraApiExhaustively", () =>
            arrayToAsyncGenerator([{
              response: new Response(),
              data: getFakeJiraRestSearchResponse({ issues: [getFakeJiraIssue()] }),
            }])),
        )
      })
    })
  })

  await t.step("should yield what gets fetched", async () => {
    const issue = getFakeJiraIssue()
    const fakeJiraRestSearchResponse = getFakeJiraRestSearchResponse({ issues: [issue] })
    await withMockedFetch(async () => {
      await withStubs(
        async () => {
          const result = await asyncToArray(fetchJiraSearchIssues({
            projectKeys: ["PRD"],
            user: "example@atlassian.com",
            token: "token",
            host: "example.com",
          }))

          assertEquals(result, [{ issue, names: fakeJiraRestSearchResponse.names }])
        },
        stub(_internals, "fetchJiraApiExhaustively", () =>
          arrayToAsyncGenerator([{
            response: new Response(),
            data: fakeJiraRestSearchResponse,
          }])),
      )
    })
  })
})
