import { filterUndefined } from "../utils.ts"

import { ParsedImport } from "./types.ts"

export function parseImportLine(importLine: string): ParsedImport {
  const trimmedLine = importLine.trim()

  // Check for side effect only import
  if (trimmedLine.startsWith("import ") && !trimmedLine.includes("from")) {
    const specifier = trimmedLine
      .slice(7)
      .replace(";", "")
      .replaceAll('"', "")
      .replaceAll("'", "")
      .trim()
    const moduleRoot = calculateModuleRoot(specifier)
    return filterUndefined({
      isSideEffectOnly: true,
      isTypeImport: false,
      keyword: "import",
      moduleSpecifier: specifier,
      moduleSpecifierDistance: calculateDistance(specifier),
      moduleRoot,
      moduleRootDistance: calculateDistance(moduleRoot),
      type: categorizeImportType(specifier),
    })
  }

  const result: Partial<ParsedImport> = { isSideEffectOnly: false, keyword: "import" } as const

  // Check for type import
  if (trimmedLine.startsWith("import type")) {
    result.isTypeImport = true
  } else {
    result.isTypeImport = false
  }

  // Extract module specifier
  const moduleSpecifierMatch = trimmedLine.match(/from\s+(['"])(.*?)\1/)
  if (moduleSpecifierMatch) {
    const specifier = moduleSpecifierMatch[2]
    result.moduleSpecifier = specifier
    result.moduleSpecifierDistance = calculateDistance(specifier)
    const moduleRoot = calculateModuleRoot(specifier)
    result.moduleRoot = moduleRoot
    result.moduleRootDistance = calculateDistance(moduleRoot)
    result.type = categorizeImportType(specifier)
  }

  // Extract default and namespace import combination
  const defaultAndNamespaceImportMatch = trimmedLine.match(/import\s+(\w+),\s*\*\s+as\s+(\w+)/)
  if (defaultAndNamespaceImportMatch) {
    result.defaultImport = defaultAndNamespaceImportMatch[1]
    result.namespaceImport = defaultAndNamespaceImportMatch[2]
  } else {
    // Existing logic for extracting default and namespace imports separately
    const defaultImportMatch = trimmedLine.match(/import\s+(\w+)/)
    if (defaultImportMatch && !result.isTypeImport) {
      result.defaultImport = defaultImportMatch[1]
    }

    const namespaceImportMatch = trimmedLine.match(/import\s+\*\s+as\s+(\w+)/)
    if (namespaceImportMatch) {
      result.namespaceImport = namespaceImportMatch[1]
    }
  }

  // Extract named imports
  const namedImportMatch = trimmedLine.match(/{\s*(.*?)\s*}/ms)
  if (namedImportMatch) {
    const namedImports = namedImportMatch[1]
      .split(",")
      .map((el) => el.trim())
      .filter((el) => el.length > 0)
    result.namedImports = namedImports.map((item) => {
      const [name, alias] = item.split(/\s+as\s+/)
      return filterUndefined({ name, alias })
    })
  }

  return filterUndefined(result) as ParsedImport
}

function categorizeImportType(moduleSpecifier: string): ParsedImport["type"] {
  if (moduleSpecifier.includes("#")) return "alias"
  if (moduleSpecifier.startsWith(".")) return "relative"
  return "module"
}

function calculateDistance(modulePath: string): number | undefined {
  if (!modulePath.startsWith(".")) {
    // This is not a relative module specifier
    return
  }
  const elements = modulePath.split("/")
  const direction = elements[0] === "." ? -1 : 1
  let dist = elements[elements.length - 1].endsWith("mod.ts") ? 0.5 : 0

  if (elements[elements.length - 1].endsWith(".ts")) {
    elements.pop()
  }
  for (const el of elements) {
    if (el === "..") dist += 2
    else if (el === ".") dist += 0
    else dist += 1
  }
  return dist * direction
}

function calculateModuleRoot(moduleSpecifier: string): string {
  const paths = []
  const split = moduleSpecifier.split("/")
  if (moduleSpecifier.endsWith(".ts")) {
    for (const el of split.slice(0, split.length - 1)) {
      paths.push(el)
      if (!el.includes(".")) {
        break
      }
    }
  } else {
    for (const el of split) {
      paths.push(el)
      if (!el.includes(".")) {
        break
      }
    }
  }
  return paths.join("/")
}
