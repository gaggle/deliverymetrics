import { assertEquals } from "dev:asserts"

import { identifyImportBlockBoundaries } from "./identify-import-block-boundaries.ts"

const realWorldExamples: Array<{ input: string; expected: [number, number] }> = [
  {
    input: `
/**
 * Foo
 */
// Bar

import { a } from "a"
import * as b from "b"

import { c } from "../../c/mod.ts"

  import {
    d,
  } from "../../d.ts"

function* baz() {}
`,
    expected: [6, 14],
  },
  {
    input: `import { identifyImportBlockBoundaries } from "./identify-import-block-boundaries.ts";
import { detokenize, tokenize } from "./tokenize.ts";
import { separateImportsIntoBlocks } from "./separate-imports-into-blocks.ts";
import { sortImports } from "./sort-imports.ts";

export function formatImportBlocks(content: string): string {`,
    expected: [0, 4],
  },
  {
    input: `import { main } from "./cli/mod.ts"

main(Deno.args)`,
    expected: [0, 1],
  },
]

Deno.test("identifyImportBlock", async (t) => {
  for (const [idx, { input, expected }] of realWorldExamples.entries()) {
    await t.step(`example ${idx}`, () => {
      const actual = identifyImportBlockBoundaries(input.split("\n"))
      assertEquals(actual, expected)
    })
  }
})
