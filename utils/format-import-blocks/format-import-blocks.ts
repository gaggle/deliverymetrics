import { identifyImportBlockBoundaries } from "./identify-import-block-boundaries.ts"
import { separateImportsIntoBlocks } from "./separate-imports-into-blocks.ts"
import { sortImports } from "./sort-imports.ts"
import { detokenize, tokenize } from "./tokenize.ts"

export function formatImportBlocks(content: string): string {
  const lines = content.split("\n")
  const boundaries = identifyImportBlockBoundaries(lines)
  if (!boundaries) return content
  const [intro, importBlock, rest] = extract(lines, ...boundaries)
  const formattedImportBlock = detokenize(
    separateImportsIntoBlocks(
      sortImports(
        tokenize(
          importBlock,
        ),
      ),
    ),
  )
  const introStr = intro.length ? `${intro.join("\n")}\n` : ""
  const restStr = rest.length ? `\n${rest.join("\n")}` : ""
  return `${introStr}${formattedImportBlock.join("\n")}${restStr}`
}

function extract(lines: string[], start: number, end: number): [string[], string[], string[]] {
  const prefix = lines.slice(0, start)
  const extract = lines.slice(start, end)
  const suffix = lines.slice(end)
  return [prefix, extract, suffix]
}
