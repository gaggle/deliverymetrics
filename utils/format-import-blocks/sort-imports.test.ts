import { assertEquals } from "dev:asserts"

import { sortImports } from "./sort-imports.ts"
import { TokenizedImport } from "./types.ts"

Deno.test("sortImports sorts absolute imports", () => {
  const actual = sortImports([
    new TokenizedImport(`import { bar } from "b"`),
    new TokenizedImport(`import { foo } from "a"`),
  ])
  assertEquals(actual.map((el) => el.value), [
    `import { foo } from "a"`,
    `import { bar } from "b"`,
  ])
})

Deno.test("sortImports sorts absolute star imports", () => {
  const actual = sortImports([
    new TokenizedImport(`import * as a from "foo"`),
    new TokenizedImport(`import * as b from "bar"`),
  ])
  assertEquals(actual.map((el) => el.value), [
    `import * as b from "bar"`,
    `import * as a from "foo"`,
  ])
})

Deno.test("sortImports sorts local aliases", () => {
  const actual = sortImports([
    new TokenizedImport(`import { b_spam } from "#b/ham/spam.ts"`),
    new TokenizedImport(`import { a } from "#a"`),
    new TokenizedImport(`import { a_foo } from "#a/foo/bar.ts"`),
  ])
  assertEquals(actual.map((el) => el.value), [
    `import { a } from "#a"`,
    `import { a_foo } from "#a/foo/bar.ts"`,
    `import { b_spam } from "#b/ham/spam.ts"`,
  ])
})

Deno.test("sortImports sorts local star aliases", () => {
  const actual = sortImports([
    new TokenizedImport(`import * as bar_ham from "#bar/ham"`),
    new TokenizedImport(`import * as foo_spam from "#foo/spam"`),
    new TokenizedImport(`import * as foo from "#foo"`),
    new TokenizedImport(`import * as bar from "#bar"`),
  ])
  assertEquals(
    actual.map((el) => el.value),
    [
      `import * as bar from "#bar"`,
      `import * as bar_ham from "#bar/ham"`,
      `import * as foo from "#foo"`,
      `import * as foo_spam from "#foo/spam"`,
    ],
  )
})

Deno.test("sortImports sorts upstream relative imports", () => {
  const actual = sortImports([
    new TokenizedImport(`import { 5mod } from "../../5/mod.ts"`),
    new TokenizedImport(`import { 5a } from "../../5/a.ts"`),
  ])
  assertEquals(actual.map((el) => el.value), [
    `import { 5mod } from "../../5/mod.ts"`,
    `import { 5a } from "../../5/a.ts"`,
  ])
})

Deno.test("sortImports sorts upstream relative star imports", () => {
  const actual = sortImports([
    new TokenizedImport(`import * as bar from "../3/bar.ts"`),
    new TokenizedImport(`import * as foo from "../3/foo.ts"`),
    new TokenizedImport(`import * as mod from "../3/mod.ts"`),
  ])
  assertEquals(actual.map((el) => el.value), [
    `import * as mod from "../3/mod.ts"`,
    `import * as bar from "../3/bar.ts"`,
    `import * as foo from "../3/foo.ts"`,
  ])
})

Deno.test("sortImports sorts downstream relative imports", () => {
  const actual = sortImports([
    new TokenizedImport(`import { a } from "./a.ts"`),
    new TokenizedImport(`import { 12c } from "./1/2/c.ts"`),
    new TokenizedImport(`import { 1b } from "./1/b.ts"`),
    new TokenizedImport(`import { 1mod } from "./1/mod.ts"`),
  ])
  assertEquals(actual.map((el) => el.value), [
    `import { 12c } from "./1/2/c.ts"`,

    `import { 1mod } from "./1/mod.ts"`,
    `import { 1b } from "./1/b.ts"`,

    `import { a } from "./a.ts"`,
  ])
})

Deno.test("sortImports sorts downstream relative star imports", () => {
  const actual = sortImports([
    new TokenizedImport(`import * as foo from "./foo/mod.ts"`),
    new TokenizedImport(`import * as mod from "./mod.ts"`),
    new TokenizedImport(`import * as foo_spam from "./foo/spam.ts"`),
    new TokenizedImport(`import * as bar from "./bar.ts"`),
  ])
  assertEquals(actual.map((el) => el.value), [
    `import * as foo from "./foo/mod.ts"`,
    `import * as foo_spam from "./foo/spam.ts"`,

    `import * as mod from "./mod.ts"`,
    `import * as bar from "./bar.ts"`,
  ])
})

Deno.test("sortImports sorts a mix of module and relative imports", () => {
  const actual = sortImports([
    new TokenizedImport(`import { assertEquals } from "dev:asserts"`),
    new TokenizedImport(`import { assertSpyCalls, Stub, stub } from "dev:mock"`),
    new TokenizedImport(`import { withStubs } from "../../utils/dev-utils.ts"`),
    new TokenizedImport(`import { ham } from "./foo/ham.ts"`),
    new TokenizedImport(`import { fullGithubSync } from "./sync-handler.ts"`),
  ])
  assertEquals(actual.map((el) => el.value), [
    `import { assertEquals } from "dev:asserts"`,
    `import { assertSpyCalls, Stub, stub } from "dev:mock"`,

    `import { withStubs } from "../../utils/dev-utils.ts"`, // 3

    `import { ham } from "./foo/ham.ts"`, // -1

    `import { fullGithubSync } from "./sync-handler.ts"`, // 0
  ])
})

const realWorldExamples: Array<{ input: string[]; expected: string[] }> = [
  {
    input: [
      `import { c } from "../../utils/mod.ts"`,
      `import { a } from "../../libs/github/api/action-workflows/mod.ts"`,
      `import { b } from "../../libs/metrics/mod.ts"`,
    ],
    expected: [
      `import { a } from "../../libs/github/api/action-workflows/mod.ts"`,
      `import { b } from "../../libs/metrics/mod.ts"`,
      `import { c } from "../../utils/mod.ts"`,
    ],
  },
  {
    input: [
      `import { separateImportsIntoBlocks } from "./separate-imports-into-blocks.ts"`,
      `import { BlockSeparator, TokenizedImport } from "./types.ts"`,
      `import { assertEquals } from "dev:asserts"`,
    ],
    expected: [
      `import { assertEquals } from "dev:asserts"`,
      `import { separateImportsIntoBlocks } from "./separate-imports-into-blocks.ts"`,
      `import { BlockSeparator, TokenizedImport } from "./types.ts"`,
    ],
  },
  {
    input: [
      `import { STATUS_TEXT } from "std:http-status"`,
      `import { StringWriter } from "std:io"`,
      `import { assertEquals } from "dev:asserts"`,
      `import { assertSpyCalls, Stub, stub } from "dev:mock"`,
      `import { getFakeGithubPull } from "../../libs/github/api/pulls/mod.ts"`,
      `import { githubRestSpec } from "../../libs/github/api/github-rest-api-spec.ts"`,
      `import { GithubClient } from "../../libs/github/types/mod.ts"`,
      `import { createFakeGithubClient } from "../../libs/github/testing/mod.ts"`,
      `import { parseWithZodSchemaFromRequest, stringToStream } from "../../utils/mod.ts"`,
      `import { withStubs } from "../../utils/dev-utils.ts"`,
      `import { ham } from "./foo/ham.ts"`,
      `import { foo } from "../../utils/mod.ts"`,
      `import { fullGithubSync } from "./sync-handler.ts"`,
    ],
    expected: [
      `import { assertEquals } from "dev:asserts"`,
      `import { assertSpyCalls, Stub, stub } from "dev:mock"`,

      `import { STATUS_TEXT } from "std:http-status"`,
      `import { StringWriter } from "std:io"`,

      `import { getFakeGithubPull } from "../../libs/github/api/pulls/mod.ts"`, // 6

      `import { createFakeGithubClient } from "../../libs/github/testing/mod.ts"`, // 5
      `import { GithubClient } from "../../libs/github/types/mod.ts"`, // 5
      `import { githubRestSpec } from "../../libs/github/api/github-rest-api-spec.ts"`, // 5

      `import { foo } from "../../utils/mod.ts"`, // 3
      `import { parseWithZodSchemaFromRequest, stringToStream } from "../../utils/mod.ts"`, // 3
      `import { withStubs } from "../../utils/dev-utils.ts"`, // 3

      `import { ham } from "./foo/ham.ts"`, // -1

      `import { fullGithubSync } from "./sync-handler.ts"`, // 0
    ],
  },
  {
    input: [
      `import { STATUS_TEXT } from "std:http-status"`,
      `import { StringWriter } from "std:io"`,
      `import { assertEquals } from "dev:asserts"`,
      `import { assertSpyCalls, Stub, stub } from "dev:mock"`,
      `import { getFakeGithubPull } from "../../libs/github/api/pulls/mod.ts"`,
      `import { githubRestSpec } from "../../libs/github/api/github-rest-api-spec.ts"`,
      `import { GithubClient } from "../../libs/github/types/mod.ts"`,
      `import { createFakeGithubClient } from "../../libs/github/testing/mod.ts"`,
      `import { parseWithZodSchemaFromRequest, stringToStream } from "../../utils/mod.ts"`,
      `import { withStubs } from "../../utils/dev-utils.ts"`,
      `import { ham } from "./foo/ham.ts"`,
      `import { foo } from "../../utils/mod.ts"`,
      `import { fullGithubSync } from "./sync-handler.ts"`,
    ],
    expected: [
      `import { assertEquals } from "dev:asserts"`,
      `import { assertSpyCalls, Stub, stub } from "dev:mock"`,

      `import { STATUS_TEXT } from "std:http-status"`,
      `import { StringWriter } from "std:io"`,

      `import { getFakeGithubPull } from "../../libs/github/api/pulls/mod.ts"`, // 6

      `import { createFakeGithubClient } from "../../libs/github/testing/mod.ts"`, // 5
      `import { GithubClient } from "../../libs/github/types/mod.ts"`, // 5
      `import { githubRestSpec } from "../../libs/github/api/github-rest-api-spec.ts"`, // 5

      `import { foo } from "../../utils/mod.ts"`, // 3
      `import { parseWithZodSchemaFromRequest, stringToStream } from "../../utils/mod.ts"`, // 3
      `import { withStubs } from "../../utils/dev-utils.ts"`, // 3

      `import { ham } from "./foo/ham.ts"`, // -1

      `import { fullGithubSync } from "./sync-handler.ts"`, // 0
    ],
  },
  {
    input: [
      `import { JiraSyncInfo, ReadonlyJiraClient } from "../jira/mod.ts"`,
      `import { JiraSearchIssue, JiraSearchNames } from "../jira/api/search/mod.ts"`,
    ],
    expected: [
      `import { JiraSearchIssue, JiraSearchNames } from "../jira/api/search/mod.ts"`,
      `import { JiraSyncInfo, ReadonlyJiraClient } from "../jira/mod.ts"`,
    ],
  },
  {
    input: [
      `import { arrayToAsyncGenerator, asyncToArray, daysBetween, flattenObject } from "../../utils/mod.ts"`,
      `import { AbortError } from "../../utils/mod.ts"`,
    ],
    expected: [
      `import { AbortError } from "../../utils/mod.ts"`,
      `import { arrayToAsyncGenerator, asyncToArray, daysBetween, flattenObject } from "../../utils/mod.ts"`,
    ],
  },
  {
    input: [
      `import { a } from "../../utils/mod.ts"`,
      `import { d } from "../jira/mod.ts"`,
      `import { b } from "../../utils/errors.ts"`,
      `import { c } from "../jira/api/search/mod.ts"`,
    ],
    expected: [
      `import { a } from "../../utils/mod.ts"`,
      `import { b } from "../../utils/errors.ts"`,
      `import { c } from "../jira/api/search/mod.ts"`,
      `import { d } from "../jira/mod.ts"`,
    ],
  },
]

for (const [idx, { input, expected }] of realWorldExamples.entries()) {
  Deno.test(`sortImports sorts real-world example #${idx + 1}`, () => {
    const actual = sortImports(input.map((el) => new TokenizedImport(el)))
    assertEquals(actual.map((el) => el.value), expected)
  })
}
