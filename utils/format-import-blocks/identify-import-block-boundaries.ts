export function identifyImportBlockBoundaries(lines: string[]): [number, number] | undefined {
  let start: number | undefined = undefined
  let end: number | undefined = undefined
  let inMultilineImport = false

  const isStartOfMultilineImport = (trimmedLine: string): boolean => {
    if (inMultilineImport) return false
    return trimmedLine.endsWith("import {")
  }

  const isEndOfMultilineImport = (trimmedLine: string): boolean => {
    if (!inMultilineImport) return false
    return trimmedLine.includes('} from "')
  }

  for (const [idx, line] of lines.entries()) {
    const trimmedLine = line.trim()
    const isEmpty = trimmedLine === ""
    const isImport = trimmedLine.startsWith("import")
    const isInsideMultilineImport = inMultilineImport || isStartOfMultilineImport(trimmedLine)

    if (isImport || isEmpty || isInsideMultilineImport) {
      // Delay setting the `start` index until we encounter the first import statement
      if (isImport && start === undefined) {
        start = idx
      }
      if (isImport || isInsideMultilineImport) {
        end = idx
      }
      if (isStartOfMultilineImport(trimmedLine)) {
        inMultilineImport = true
      } else if (isEndOfMultilineImport(trimmedLine)) {
        inMultilineImport = false
      }
    } else if (start !== undefined) {
      break
    }
  }
  if (start !== undefined && end !== undefined) {
    return [start, end + 1]
  }
  return undefined
}
