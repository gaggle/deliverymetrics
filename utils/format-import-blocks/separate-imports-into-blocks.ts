import { BlockSeparator, TokenizedImport } from "./types.ts"

export function separateImportsIntoBlocks(tokens: TokenizedImport[]): Array<TokenizedImport | BlockSeparator> {
  return tokens.reduce(tokenSeparationReducer, [])
}

function tokenSeparationReducer(
  acc: Array<TokenizedImport | BlockSeparator>,
  curr: TokenizedImport,
): Array<TokenizedImport | BlockSeparator> {
  const prev = acc[acc.length - 1]
  if (!prev) {
    return [...acc, curr]
  }

  if (prev instanceof BlockSeparator) {
    return [...acc, curr]
  }

  if (prev.parsed.type !== curr.parsed.type) {
    return [...acc, new BlockSeparator(), curr]
  }

  if (prev.parsed.type === "alias" && curr.parsed.type === "alias") {
    if (prev.parsed.moduleRoot === curr.parsed.moduleRoot) {
      return [...acc, curr]
    } else {
      return [...acc, new BlockSeparator(), curr]
    }
  }

  if (prev.parsed.type === "relative" && curr.parsed.type === "relative") {
    if (prev.parsed.moduleRoot === curr.parsed.moduleRoot) {
      return [...acc, curr]
    } else {
      return [...acc, new BlockSeparator(), curr]
    }
  }
  return [...acc, curr]
}
