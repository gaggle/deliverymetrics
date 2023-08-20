import { BlockSeparator, TokenizedImport } from "./types.ts"

export function tokenize(lines: string[]): TokenizedImport[] {
  let inMultilineImport = false
  let combined = ""
  const tokens: TokenizedImport[] = []

  for (
    const line of lines.filter((el) => el.trim().length > 0)
  ) {
    const isImport = line.startsWith("import")
    const isInsideMultilineImport = inMultilineImport || line.endsWith("{")

    if (isImport || isInsideMultilineImport) {
      combined += `${line}\n`

      if (line.endsWith("{")) {
        inMultilineImport = true
      } else if (line.includes("from")) {
        inMultilineImport = false
        tokens.push(new TokenizedImport(combined.trim()))
        combined = ""
      }
    }
  }
  return tokens
}

export function detokenize(tokens: Array<TokenizedImport | BlockSeparator>): string[] {
  return tokens.map((el) => el instanceof TokenizedImport ? el.value : "")
}
