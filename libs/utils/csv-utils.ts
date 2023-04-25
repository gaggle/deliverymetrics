import { CSVWriteCellOptions, CSVWriterOptions, writeCSVObjects } from "csv"
import { ensureFile } from "std:fs"

import { withFileOpen, withTempFile } from "./path-and-file-utils.ts"
import { arraySubtract, mapIter } from "./utils.ts"

export async function writeCSVToFile(
  fp: string,
  iter: AsyncGenerator<{ [key: string]: string }>,
  options: Partial<CSVWriterOptions & CSVWriteCellOptions> & { header: string[] },
) {
  let hasIterated = false
  await withTempFile(async (tmpFp) => {
    await withFileOpen(
      async (f) => {
        await writeCSVObjects(
          f,
          mapIter((el) => {
            hasIterated = true

            const missingKeys = arraySubtract(options.header, Object.keys(el))
            for (const key of missingKeys) {
              el[key] = ""
            }
            return el
          }, iter),
          options,
        )
      },
      tmpFp,
      { write: true, create: true, truncate: true },
    )

    if (hasIterated) {
      await ensureFile(fp)
      await Deno.copyFile(tmpFp, fp)
    }
  })
}

/**
 * 29/03/2022  00.00.00
 */
export function toExcelDate(date: Date): string {
  const dd = date.getUTCDate().toString().padStart(2, "0")
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, "0")
  const yyyy = date.getUTCFullYear()

  const hr = date.getUTCHours().toString().padStart(2, "0")
  const min = date.getUTCMinutes().toString().padStart(2, "0")
  const sec = date.getUTCSeconds().toString().padStart(2, "0")
  return `${yyyy}/${mm}/${dd} ${hr}.${min}.${sec}`
}
