import { assertEquals } from "dev:asserts"

import { tokenize } from "./tokenize.ts"
import { TokenizedImport } from "./types.ts"

Deno.test("tokenizes imports", () => {
  const imports = [
    `import {a} from "../a.ts"`,
    `import {b} from "../b.ts"`,
  ]

  assertEquals(tokenize(imports), [
    new TokenizedImport(`import {a} from "../a.ts"`),
    new TokenizedImport(`import {b} from "../b.ts"`),
  ])
})

Deno.test("tokenizes handles multi-line imports", () => {
  const multiLineImport = `import {
  a,
 b,
c,
} from "../../d.ts"`.split("\n")

  assertEquals(tokenize(multiLineImport), [
    new TokenizedImport(`import {
  a,
 b,
c,
} from "../../d.ts"`),
  ])
})
