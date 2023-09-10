import { assertEquals, assertObjectMatch } from "dev:asserts"

import { asyncSingle, asyncToArray } from "../../utils/mod.ts"

import {
  DBJiraSearchIssue,
  DBJiraSearchNames,
  getFakeDbJiraSearchIssue,
  getFakeDbJiraSearchNames,
} from "../jira/api/search/mod.ts"
import { createFakeReadonlyJiraClient, getFakeJiraSyncInfo } from "../jira/mod.ts"

import { getJiraSearchDataYielder } from "./jira-search-data.ts"

Deno.test("fieldKeys emits all field names, including those whose values are globally null", async () => {
  const client = await createFakeReadonlyJiraClient({
    syncs: [getFakeJiraSyncInfo({ type: "search" })],
    searchIssues: [
      getFakeDbJiraSearchIssue(
        { namesHash: undefined, issue: { fields: { foo: "1" } } },
        { wipeBaseFields: true },
      ),
      getFakeDbJiraSearchIssue(
        { namesHash: undefined, issue: { fields: { foo: "2", bar: "1", baz: null } } },
        { wipeBaseFields: true },
      ),
      getFakeDbJiraSearchIssue(
        { namesHash: undefined, issue: { fields: { baz: null, ham: null } } },
        { wipeBaseFields: true },
      ),
    ],
  })

  const { fieldKeys } = await getJiraSearchDataYielder(client, { excludeUnusedFields: false })

  assertEquals(fieldKeys, ["foo", "bar", "baz", "ham"])
})

Deno.test("fieldKeys can exclude globally unused fields", async () => {
  const client = await createFakeReadonlyJiraClient({
    syncs: [getFakeJiraSyncInfo({ type: "search" })],
    searchIssues: [
      getFakeDbJiraSearchIssue(
        { namesHash: undefined, issue: { fields: { foo: "1" } } },
        { wipeBaseFields: true },
      ),
      getFakeDbJiraSearchIssue(
        { namesHash: undefined, issue: { fields: { foo: "2", bar: "1", baz: null } } },
        { wipeBaseFields: true },
      ),
      getFakeDbJiraSearchIssue(
        { namesHash: undefined, issue: { fields: { baz: null, ham: null } } },
        { wipeBaseFields: true },
      ),
    ],
  })

  const { fieldKeys } = await getJiraSearchDataYielder(client, { excludeUnusedFields: true })

  assertEquals(fieldKeys, ["foo", "bar"])
})

Deno.test("yieldJiraSearchIssues returns an async generator of issues", async () => {
  const dbIssue = getFakeDbJiraSearchIssue({
    issue: { fields: { updated: "1970-01-10T00:00:00.000+0000" } },
    namesHash: "123",
  })
  const dbNames = getFakeDbJiraSearchNames({
    names: { "customfield_19175": "Foo Bar", "updated": "Updated" },
    hash: dbIssue.namesHash,
  })
  const client = await createFakeReadonlyJiraClient({
    syncs: [getFakeJiraSyncInfo({ type: "search" })],
    searchIssues: [dbIssue],
    searchNames: [dbNames],
  })

  const { yieldJiraSearchIssues } = await getJiraSearchDataYielder(client)

  assertEquals((await asyncToArray(yieldJiraSearchIssues)).map((el) => el.id), [dbIssue.issue.id])
})

Deno.test("yieldJiraSearchIssues stops yielding issues after maxDays old", async () => {
  const client = await createFakeReadonlyJiraClient({
    syncs: [
      getFakeJiraSyncInfo({
        type: "search",
        createdAt: new Date("1970-01-20T00:00:00.000+0000").getTime(),
        updatedAt: new Date("1970-01-20T00:00:00.000+0000").getTime(),
      }),
    ],
    searchIssues: [
      getFakeDbJiraSearchIssue({
        issue: { fields: { updated: "1970-01-10T00:00:00.000+0000" } },
        namesHash: "123",
      }),
      getFakeDbJiraSearchIssue({
        issue: { fields: { updated: "1970-01-09T23:59:59.999+0000" } },
        namesHash: "123",
      }),
    ],
    searchNames: [getFakeDbJiraSearchNames({
      names: { "customfield_19175": "Foo Bar", "updated": "Updated" },
      hash: "123",
    })],
  })

  const { yieldJiraSearchIssues } = await getJiraSearchDataYielder(client, { maxDays: 10 })

  assertEquals((await asyncToArray(yieldJiraSearchIssues)).length, 1)
})

Deno.test("yieldJiraSearchIssues can include only specified statuses", async () => {
  const doneDbIssue = getFakeDbJiraSearchIssue({
    issue: { key: "2", fields: { status: { name: "Done" } } },
    namesHash: "123",
  })
  const client = await createFakeReadonlyJiraClient({
    syncs: [getFakeJiraSyncInfo({ type: "search" })],
    searchIssues: [
      getFakeDbJiraSearchIssue({ issue: { key: "1", fields: { status: { name: "Started" } } }, namesHash: "123" }),
      doneDbIssue,
    ],
    searchNames: [getFakeDbJiraSearchNames({ hash: "123" })],
  })

  const { yieldJiraSearchIssues } = await getJiraSearchDataYielder(client, { includeStatuses: ["Done"] })

  assertEquals((await asyncSingle(yieldJiraSearchIssues)).id, doneDbIssue.issue.id)
})

Deno.test("yieldJiraSearchIssues can include only specified types", async () => {
  const storyDbIssue = getFakeDbJiraSearchIssue({
    issue: { key: "2", fields: { issuetype: { name: "Story" } } },
    namesHash: "123",
  })
  const client = await createFakeReadonlyJiraClient({
    syncs: [getFakeJiraSyncInfo({ type: "search" })],
    searchIssues: [
      getFakeDbJiraSearchIssue({ issue: { key: "1", fields: { issuetype: { name: "Bug" } } }, namesHash: "123" }),
      storyDbIssue,
    ],
    searchNames: [getFakeDbJiraSearchNames({ hash: "123" })],
  })

  const { yieldJiraSearchIssues } = await getJiraSearchDataYielder(client, { includeTypes: ["Story"] })

  assertEquals((await asyncSingle(yieldJiraSearchIssues)).id, storyDbIssue.issue.id)
})

Deno.test("yieldJiraSearchIssues can sort by field", async () => {
  const client = await createFakeReadonlyJiraClient({
    syncs: [getFakeJiraSyncInfo({ type: "search" })],
    searchIssues: [
      getFakeDbJiraSearchIssue({ namesHash: undefined, issue: { key: "4", fields: { foo: null } } }),
      getFakeDbJiraSearchIssue({ namesHash: undefined, issue: { key: "2", fields: { foo: "2000-01-01" } } }),
      getFakeDbJiraSearchIssue({ namesHash: undefined, issue: { key: "1", fields: { foo: "1999-01-01" } } }),
      getFakeDbJiraSearchIssue({ namesHash: undefined, issue: { key: "3", fields: { foo: "2001-01-01" } } }),
    ],
  })

  const { yieldJiraSearchIssues } = await getJiraSearchDataYielder(client, {
    sortBy: { key: "fields.foo", type: "date" },
  })
  const results = await asyncToArray(yieldJiraSearchIssues)
  assertEquals(results.map((el) => el.key), ["1", "2", "3", "4"])
})

Deno.test("yieldJiraSearchIssues can sort by translated field", async () => {
  const client = await createFakeReadonlyJiraClient({
    syncs: [getFakeJiraSyncInfo({ type: "search" })],
    searchIssues: [
      getFakeDbJiraSearchIssue({ issue: { key: "2", fields: { foo: "2000-01-01" } } }, { wipeBaseFields: true }),
      getFakeDbJiraSearchIssue({ issue: { key: "1", fields: { foo: "1999-01-01" } } }, { wipeBaseFields: true }),
    ],
    searchNames: [getFakeDbJiraSearchNames({ names: { foo: "Mr. Foo" } })],
  })

  const { yieldJiraSearchIssues } = await getJiraSearchDataYielder(client, {
    sortBy: { key: "fields.Mr. Foo (foo)", type: "date" },
  })
  const results = await asyncToArray(yieldJiraSearchIssues)
  assertEquals(results.map((el) => el.key), ["1", "2"])
})

const translationsTestSuite: Record<string, {
  searchIssues: DBJiraSearchIssue[]
  searchNames: DBJiraSearchNames[]
  expectedFieldKeys?: string[]
  expectedIssueFields?: Record<string, unknown>[]
  only?: boolean
}> = {
  "two field keys translating to the same label have disambiguated translations": {
    searchIssues: [{ issue: { fields: { foo: "foo", bar: { ham: "spam" } } }, namesHash: "123" }],
    searchNames: [{ names: { foo: "Label", bar: "Label" }, hash: "123" }],
    expectedFieldKeys: ["Label (foo)", "Label (bar).ham"],
    expectedIssueFields: [{ "Label (foo)": "foo", "Label (bar)": { ham: "spam" } }],
  },
  "if a field key is basically the same as its label then don't add field key to the translation": {
    searchIssues: [{
      issue: { fields: { same: "1", withspacing: "2", withdash: "3", pascalCasedKey: "4" } },
      namesHash: "123",
    }],
    searchNames: [{
      names: { same: "Same", withspacing: "With Spacing", withdash: "With-Dash", pascalCasedKey: "Pascal Cased Key" },
      hash: "123",
    }],
    expectedFieldKeys: ["Same", "With Spacing", "With-Dash", "Pascal Cased Key"],
    expectedIssueFields: [{ "Same": "1", "With Spacing": "2", "With-Dash": "3", "Pascal Cased Key": "4" }],
  },
  "if two field keys translations clash across different issues they are still disambiguated": {
    searchIssues: [
      { issue: { fields: { foo: "foo" } }, namesHash: "123" },
      { issue: { fields: { bar: "bar" } }, namesHash: "123" },
    ],
    searchNames: [{ names: { foo: "Mr. Ham", bar: "Mr. Ham" }, hash: "123" }],
    expectedFieldKeys: ["Mr. Ham (foo)", "Mr. Ham (bar)"],
    expectedIssueFields: [{ "Mr. Ham (foo)": "foo" }, { "Mr. Ham (bar)": "bar" }],
  },
  "if multiple Jira Search Names causes a clash then field keys are disambiguated appropriately": {
    searchIssues: [
      { issue: { fields: { foo: "foo" } }, namesHash: "123" },
      { issue: { fields: { bar: "bar" } }, namesHash: "456" },
    ],
    searchNames: [
      { names: { foo: "Mr. Ham" }, hash: "123" },
      { names: { bar: "Mr. Ham" }, hash: "456" },
    ],
    expectedFieldKeys: ["Mr. Ham (foo)", "Mr. Ham (bar)"],
    expectedIssueFields: [{ "Mr. Ham (foo)": "foo" }, { "Mr. Ham (bar)": "bar" }],
  },
  "issue field keys are translated according to the labels that issue is associated with": {
    searchIssues: [
      { issue: { fields: { foo: "foo1" } }, namesHash: "123" },
      { issue: { fields: { foo: "foo2" } }, namesHash: "456" },
    ],
    searchNames: [
      { names: { foo: "Mr. Ham" }, hash: "123" },
      { names: { foo: "Mr. Spam" }, hash: "456" },
    ],
    expectedFieldKeys: ["Mr. Ham (foo)", "Mr. Spam (foo)"],
    expectedIssueFields: [{ "Mr. Ham (foo)": "foo1" }, { "Mr. Spam (foo)": "foo2" }],
  },
  "translation collisions are avoided even across a complex set of separate issues and names": {
    searchIssues: [
      { issue: { fields: { foo: "foo1" } }, namesHash: "123" },
      { issue: { fields: { foo: "foo2" } }, namesHash: "456" },
      { issue: { fields: { foo: "foo3" } }, namesHash: "789" },
      { issue: { fields: { bar: "bar4" } }, namesHash: "789" },
      { issue: { fields: { eggs: "eggs5" } }, namesHash: "789" },
    ],
    searchNames: [
      { names: { foo: "Mr. Foo", bar: "Mr. Bar" }, hash: "123" },
      { names: { foo: "Mr. Ham", bar: "Mr. Bar" }, hash: "456" },
      { names: { foo: "Mr. Ham", bar: "Mr. Ham", eggs: "Mr. Eggs" }, hash: "789" },
    ],
    expectedFieldKeys: ["Mr. Foo (foo)", "Mr. Ham (foo)", "Mr. Ham (bar)", "Mr. Eggs (eggs)"],
    expectedIssueFields: [
      { "Mr. Foo (foo)": "foo1" },
      { "Mr. Ham (foo)": "foo2" },
      { "Mr. Ham (foo)": "foo3" },
      { "Mr. Ham (bar)": "bar4" },
      { "Mr. Eggs (eggs)": "eggs5" },
    ],
  },
}

Deno.test("when translating", async (t) => {
  for (
    const [name, {
      searchNames,
      searchIssues,
      expectedFieldKeys,
      expectedIssueFields,
    }] of Object.entries(translationsTestSuite).filter(([, data], _, array) => {
      if (data.only === true) return true
      if (array.some(([, data]) => data.only)) return false
      return true
    })
  ) {
    await t.step(name, async () => {
      const client = await createFakeReadonlyJiraClient({
        syncs: [getFakeJiraSyncInfo({ type: "search" })],
        searchIssues: searchIssues.map((el) => getFakeDbJiraSearchIssue(el, { wipeBaseFields: true })),
        searchNames: searchNames.map((el) => getFakeDbJiraSearchNames(el)),
      })

      const { fieldKeys, yieldJiraSearchIssues } = await getJiraSearchDataYielder(client)
      const issues = await asyncToArray(yieldJiraSearchIssues)

      if (expectedFieldKeys) {
        assertEquals(fieldKeys, expectedFieldKeys, "mismatched fieldKeys")
      }

      if (expectedIssueFields) {
        assertEquals(issues.length, expectedIssueFields.length, "wrong number of issues yielded")
        for (const [idx, issue] of issues.entries()) {
          assertObjectMatch(
            issue.fields || {},
            expectedIssueFields[idx],
            `issue fields mismatch in test #${idx}, got: ${JSON.stringify(issue.fields, null, 2)}`,
          )
        }
      }
    })
  }
})
