import { assertEquals } from "dev:asserts"

import { formatImportBlocks } from "./format-import-blocks.ts"

for (
  const [idx, { input, expected }] of [
    {
      input: `// Foo

import { a } from "a"
import { c } from "../../c/mod.ts"
import * as b from "b"
  import {
  d,
} from "../../d.ts"

function* baz() {}
`,
      expected: `// Foo

import { a } from "a"
import * as b from "b"

import { c } from "../../c/mod.ts"

import {
  d,
} from "../../d.ts"

function* baz() {}
`,
    },
    {
      input: `import { main } from "./cli/mod.ts"

main(Deno.args)`,
      expected: `import { main } from "./cli/mod.ts"

main(Deno.args)`,
    },
    {
      input: `import * from "./1.ts"`,
      expected: `import * from "./1.ts"`,
    },
    {
      input: `
import * from "./2.ts"`,
      expected: `
import * from "./2.ts"`,
    },
    {
      input: `import * from "./3.ts"
`,
      expected: `import * from "./3.ts"
`,
    },
  ].entries()
) {
  Deno.test(`formatImportBlocks #${idx + 1}`, () => {
    const actual = formatImportBlocks(input)
    assertEquals(actual, expected)
  })
}
