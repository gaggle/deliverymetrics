import { debug } from "std:log"

import { TokenizedImport } from "./types.ts"

export function sortImports(tokens: TokenizedImport[]): TokenizedImport[] {
  return tokens.slice().sort((a, b) => {
    debug(`sortImports ${JSON.stringify({ a: a.parsed, b: b.parsed }, null, 2)}`)
    const result = sortTokenizedLines(a, b)
    debug({ result })
    return result
  })
}

function sortTokenizedLines(a: TokenizedImport, b: TokenizedImport): number {
  const {
    type: aType,
    moduleRoot: aRoot,
    moduleRootDistance: aRootDist,
    moduleSpecifier: aModule,
    moduleSpecifierDistance: aModuleDist,
  } = a.parsed
  const {
    type: bType,
    moduleRoot: bRoot,
    moduleRootDistance: bRootDist,
    moduleSpecifier: bModule,
    moduleSpecifierDistance: bModuleDist,
  } = b.parsed

  if (aType !== "relative" && bType !== "relative") {
    debug("neither are relative, comparing")
    return aRoot.localeCompare(bRoot) || aModule.localeCompare(bModule)
  }

  if (aType === "relative" && bType === "relative") {
    const aSign = Math.sign(aModuleDist!)
    const bSign = Math.sign(bModuleDist!)
    if (aModuleDist !== 0 && bModuleDist !== 0 && aSign !== bSign) {
      debug("distances are not in the same direction")
      return aModuleDist! > 0 ? -1 : 1
    }

    const aAbsRootDist = Math.abs(aRootDist!)
    const bAbsRootDist = Math.abs(bRootDist!)
    if (aAbsRootDist !== bAbsRootDist) {
      debug("root distance differs")
      return aAbsRootDist > bAbsRootDist ? -1 : 1
    }

    const aAbsDist = Math.abs(aModuleDist!)
    const bAbsDist = Math.abs(bModuleDist!)
    const absDist = aAbsDist - bAbsDist

    if (absDist === 0) {
      debug("equally distant, comparing")
      return aModule.localeCompare(bModule) || a.value.localeCompare(b.value)
    }

    debug("distances differ")
    return aAbsDist! > bAbsDist! ? -1 : 1
  }

  if (aType === "relative") {
    debug("a is relative")
    return 1
  }
  if (bType === "relative") {
    debug("b is relative")
    return -1
  }

  throw new Error("Unreachable")
}
