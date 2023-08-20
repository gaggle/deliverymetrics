import { assertEquals } from "dev:asserts"

import { separateImportsIntoBlocks } from "./separate-imports-into-blocks.ts"
import { BlockSeparator, TokenizedImport } from "./types.ts"

Deno.test("separates module from relative", () => {
  const actual = separateImportsIntoBlocks([
    new TokenizedImport(`import { a } from "a"`),
    new TokenizedImport(`import { b } from "./b.ts"`),
  ])

  assertEquals(toClassNames(actual), [
    TokenizedImport.name,
    BlockSeparator.name,
    TokenizedImport.name,
  ])
})

Deno.test("separates module from alias", () => {
  const actual = separateImportsIntoBlocks([
    new TokenizedImport(`import { a } from "a"`),
    new TokenizedImport(`import { b } from "#b"`),
  ])

  assertEquals(toClassNames(actual), [
    TokenizedImport.name,
    BlockSeparator.name,
    TokenizedImport.name,
  ])
})

Deno.test("leaves modules together", () => {
  const actual = separateImportsIntoBlocks([
    new TokenizedImport(`import { a } from "a"`),
    new TokenizedImport(`import { b } from "b"`),
  ])

  assertEquals(toClassNames(actual), [
    TokenizedImport.name,
    TokenizedImport.name,
  ])
})

Deno.test("separates aliases on their roots", () => {
  const actual = separateImportsIntoBlocks([
    new TokenizedImport(`import { a1 } from "#a"`),
    new TokenizedImport(`import { a2 } from "#a/foo.ts"`),
    new TokenizedImport(`import { c } from "#b"`),
  ])

  assertEquals(toClassNames(actual), [
    TokenizedImport.name,
    TokenizedImport.name,
    BlockSeparator.name,
    TokenizedImport.name,
  ])
})

Deno.test("separates relative imports on their roots", () => {
  const actual = separateImportsIntoBlocks([
    new TokenizedImport(`import { c } from "../b.ts"`),
    new TokenizedImport(`import { a1 } from "../a/mod.ts"`),
    new TokenizedImport(`import { a2 } from "../a/foo.ts"`),
  ])

  assertEquals(toClassNames(actual), [
    TokenizedImport.name,
    BlockSeparator.name,
    TokenizedImport.name,
    TokenizedImport.name,
  ])
})

Deno.test("separates relative imports on their roots", () => {
  const actual = separateImportsIntoBlocks([
    `import { a } from "../../libs/github/api/action-workflows/mod.ts"`,
    `import { b } from "../../libs/metrics/mod.ts"`,
    `import { c } from "../../utils/mod.ts"`,
  ].map((el) => new TokenizedImport(el)))

  assertEquals(toClassNames(actual), [
    TokenizedImport.name,
    TokenizedImport.name,
    BlockSeparator.name,
    TokenizedImport.name,
  ])
})

Deno.test("groups upstreams", () => {
  const actual = separateImportsIntoBlocks([
    `import { foo } from "./foo/mod.ts"`,
    `import { bar } from "./ham/mod.ts"`,
    `import { baz } from "./ham/baz.ts"`,
  ].map((el) => new TokenizedImport(el)))

  assertEquals(toClassNames(actual), [
    TokenizedImport.name,
    BlockSeparator.name,
    TokenizedImport.name,
    TokenizedImport.name,
  ])
})

function toClassNames<T extends { constructor: { name: string } }>(arr: T[]): string[] {
  return arr.map((el) => el.constructor.name)
}
