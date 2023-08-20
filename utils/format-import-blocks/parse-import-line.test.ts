import { assertEquals } from "dev:asserts"

import { parseImportLine } from "./parse-import-line.ts"
import { ParsedImport } from "./types.ts"

Deno.test("parseImportLine", async (t) => {
  const defaultImports: Array<[string, ParsedImport]> = [
    [`import myDefault from "my-module"`, {
      defaultImport: "myDefault",
      isTypeImport: false,
      keyword: "import",
      moduleSpecifier: "my-module",
      moduleRoot: "my-module",
      isSideEffectOnly: false,
      type: "module",
    }],
  ]
  const namedImports: Array<[string, ParsedImport]> = [
    [`import { myExport } from "my-module"`, {
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "my-module",
      moduleSpecifier: "my-module",
      namedImports: [{ name: "myExport" }],
      type: "module",
    }],
    [`import { myExport } from "my-module/foo/bar/mod.ts"`, {
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "my-module",
      moduleSpecifier: "my-module/foo/bar/mod.ts",
      namedImports: [{ name: "myExport" }],
      type: "module",
    }],
    [`import { myExport as alias } from "my-module"`, {
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "my-module",
      moduleSpecifier: "my-module",
      namedImports: [{ alias: "alias", name: "myExport" }],
      type: "module",
    }],
    [`import { export1, export2 } from "my-module"`, {
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "my-module",
      moduleSpecifier: "my-module",
      namedImports: [
        { name: "export1" },
        { name: "export2" },
      ],
      type: "module",
    }],
    [`import { export1, export2 as alias2 } from "my-module"`, {
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "my-module",
      moduleSpecifier: "my-module",
      namedImports: [
        { name: "export1" },
        { alias: "alias2", name: "export2" },
      ],
      type: "module",
    }],
  ]
  const namespaceImports: Array<[string, ParsedImport]> = [
    [`import * as myModule from "my-module"`, {
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "my-module",
      moduleSpecifier: "my-module",
      namespaceImport: "myModule",
      type: "module",
    }],
  ]
  const combinedDefaultAndNamedImports: Array<[string, ParsedImport]> = [
    [`import myDefault, { myExport } from "my-module"`, {
      defaultImport: "myDefault",
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "my-module",
      moduleSpecifier: "my-module",
      namedImports: [{ name: "myExport" }],
      type: "module",
    }],
    [`import myDefault, { myExport as alias } from "my-module"`, {
      defaultImport: "myDefault",
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "my-module",
      moduleSpecifier: "my-module",
      namedImports: [{ alias: "alias", name: "myExport" }],
      type: "module",
    }],
    [`import myDefault, { export1, export2 } from "my-module"`, {
      defaultImport: "myDefault",
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "my-module",
      moduleSpecifier: "my-module",
      namedImports: [
        { name: "export1" },
        { name: "export2" },
      ],
      type: "module",
    }],
  ]
  const combinedDefaultAndNamespaceImports: Array<[string, ParsedImport]> = [
    [`import myDefault, * as myModule from "my-module"`, {
      defaultImport: "myDefault",
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "my-module",
      moduleSpecifier: "my-module",
      namespaceImport: "myModule",
      type: "module",
    }],
  ]
  const importEntireModuleForSideEffects: Array<[string, ParsedImport]> = [
    [`import "my-module"`, {
      isSideEffectOnly: true,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "my-module",
      moduleSpecifier: "my-module",
      type: "module",
    }],
    [`import 'my-module'`, {
      isSideEffectOnly: true,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "my-module",
      moduleSpecifier: "my-module",
      type: "module",
    }],
  ]
  const typeImports: Array<[string, ParsedImport]> = [
    [`import type { MyType } from "my-module"`, {
      isSideEffectOnly: false,
      isTypeImport: true,
      keyword: "import",
      moduleRoot: "my-module",
      moduleSpecifier: "my-module",
      namedImports: [{ name: "MyType" }],
      type: "module",
    }],
  ]
  const commentedImports_: Array<[string, ParsedImport]> = [
    [`import myDefault from "my-module" // comment`, {
      defaultImport: "myDefault",
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "my-module",
      moduleSpecifier: "my-module",
      type: "module",
    }],
  ]
  const multiLineImports: Array<[string, ParsedImport]> = [
    [
      `import {
a,
b,
c,
d,
} from "my-module"`,
      {
        isSideEffectOnly: false,
        isTypeImport: false,
        keyword: "import",
        moduleRoot: "my-module",
        moduleSpecifier: "my-module",
        namedImports: [{ name: "a" }, { name: "b" }, { name: "c" }, { name: "d" }],
        type: "module",
      },
    ],
  ]
  const aliasImports: Array<[string, ParsedImport]> = [
    [`import "#a"`, {
      isSideEffectOnly: true,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "#a",
      moduleSpecifier: "#a",
      type: "alias",
    }],
    [`import { a } from "#a"`, {
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "#a",
      moduleSpecifier: "#a",
      namedImports: [{ name: "a" }],
      type: "alias",
    }],
    [`import foo from "#a/foo/bar.ts"`, {
      defaultImport: "foo",
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "#a",
      moduleSpecifier: "#a/foo/bar.ts",
      type: "alias",
    }],
  ]
  const relativeImports: Array<[string, ParsedImport]> = [
    [`import { 3a } from "../3/a.ts"`, {
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "../3",
      moduleRootDistance: 3,
      moduleSpecifier: "../3/a.ts",
      moduleSpecifierDistance: 3,
      namedImports: [{ name: "3a" }],
      type: "relative",
    }],
    [`import { f } from "../1/2/3/4/5/f.ts"`, {
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "../1",
      moduleRootDistance: 3,
      namedImports: [{ name: "f" }],
      moduleSpecifier: "../1/2/3/4/5/f.ts",
      moduleSpecifierDistance: 7,
      type: "relative",
    }],
    [`import { 5mod } from "../../5/mod.ts"`, {
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "../../5",
      moduleRootDistance: 5,
      moduleSpecifier: "../../5/mod.ts",
      moduleSpecifierDistance: 5.5,
      namedImports: [{ name: "5mod" }],
      type: "relative",
    }],
    [`import { 5a } from "../../5/a.ts"`, {
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "../../5",
      moduleRootDistance: 5,
      moduleSpecifier: "../../5/a.ts",
      moduleSpecifierDistance: 5,
      namedImports: [{ name: "5a" }],
      type: "relative",
    }],
    [`import * as mod from "./mod.ts"`, {
      isSideEffectOnly: false,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: ".",
      moduleRootDistance: -0,
      moduleSpecifier: "./mod.ts",
      moduleSpecifierDistance: -0.5,
      namespaceImport: "mod",
      type: "relative",
    }],
    [`import "./foo/mod.ts"`, {
      isSideEffectOnly: true,
      isTypeImport: false,
      keyword: "import",
      moduleRoot: "./foo",
      moduleRootDistance: -1,
      moduleSpecifier: "./foo/mod.ts",
      moduleSpecifierDistance: -1.5,
      type: "relative",
    }],
  ]

  for (
    const [input, expected] of [
      ...defaultImports,
      ...namedImports,
      ...namespaceImports,
      ...combinedDefaultAndNamedImports,
      ...combinedDefaultAndNamespaceImports,
      ...importEntireModuleForSideEffects,
      ...typeImports,
      ...commentedImports_,
      ...multiLineImports,
      ...aliasImports,
      ...relativeImports,
    ]
  ) await t.step(`can parse: ${input}`, () => assertEquals(parseImportLine(input), expected))
})
