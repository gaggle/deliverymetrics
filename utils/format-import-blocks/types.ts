import { parseImportLine } from "./parse-import-line.ts"

export type ParsedImport = {
  /**
   * The default import identifier if present
   */
  defaultImport?: string
  /**
   * Flag to indicate if the import is for side effects only
   */
  isSideEffectOnly?: boolean
  /**
   * Flag to indicate if this is a TypeScript type import
   */
  isTypeImport?: boolean
  /**
   * E.g. "import"
   */
  keyword: string
  /**
   * The root of the module, i.e. the first path of the module specifier path. Is "." for sibling modules.
   */
  moduleRoot: string
  /**
   * Distance to the module root, positive for upstream and negative for downstream
   *
   * E.g. `../foo` is distance 1, `./foo` is distance -1.
   * Only relative modules have a distance
   */
  moduleRootDistance?: number
  /**
   * The string specifying the module
   */
  moduleSpecifier: string
  /**
   * Distance to the module relative to current module, positive for upstream and negative for downstream
   *
   * E.g. `../foo.ts` is distance 1, `./foo/bar.ts` is distance -1.
   * Only relative modules have a distance, and siblings such as `./foo.ts` have distance 0.
   */
  moduleSpecifierDistance?: number
  /**
   * List of named imports, split into name and alias
   */
  namedImports?: Array<{
    name: string // Original name of the export
    alias?: string // Alias name if used
  }>
  /**
   * Namespace import identifier, if present
   */
  namespaceImport?: string
  /**
   * Imports are type module if they import external dependencies,
   * alias if import map aliases to a local path e.g. `"#utils": "./utils"`,
   * and relative are all imports importing a relative module path.
   */
  type?: "module" | "alias" | "relative"
}

export class TokenizedImport {
  readonly value: string
  readonly parsed: ParsedImport

  constructor(value: string) {
    this.value = value
    this.parsed = parseImportLine(value)
  }
}

export class BlockSeparator {
}
