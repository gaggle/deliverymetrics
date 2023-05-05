import { CSVWriteCellOptions, CSVWriterOptions, writeCSVObjects } from "csv"
import { ensureFile } from "std:fs"
import { groupBy } from "std:group-by"

import { arraySubtract, arraySubtractRegEx, mapIter, withFileOpen, withTempFile } from "./mod.ts"

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

/**
 * Reorganizes an array of header strings by excluding specified headers and
 * ordering remaining headers according to a given order.
 *
 * @example
 * const headers = ['Header1', 'Header2', 'Header3', 'Header4'];
 * const ignoreHeaders = ['Header3'];
 * const headerOrder = ['Header4', 'Header1'];
 * const result = reorganizeHeaders(headers, { ignoreHeaders, headerOrder });
 * console.log(result); // ['Header4', 'Header1', 'Header2']
 */
export function reorganizeHeaders(
  headers: Array<string>,
  { headerOrder = [], ignoreHeaders = [] }: {
    headerOrder?: Array<string | RegExp>
    ignoreHeaders?: Array<string | RegExp>
  },
): Array<string> {
  let filteredHeaders = [...headers]

  if (ignoreHeaders.length > 0) {
    filteredHeaders = arraySubtractRegEx(filteredHeaders, ignoreHeaders)
  }

  const { headerOrderRegexes, headerOrderStrings } = {
    headerOrderRegexes: [],
    headerOrderStrings: [],
    ...groupBy(
      headerOrder,
      (el) => el instanceof RegExp ? "headerOrderRegexes" : "headerOrderStrings",
    ),
  } as { headerOrderRegexes: Array<RegExp>; headerOrderStrings: Array<string> }

  const lookupHeaderOrder = (el: string) => {
    let idx = headerOrderStrings.indexOf(el)
    if (idx < 0 && !!headerOrderRegexes.find((re) => re.test(el))) idx = 0
    return idx
  }

  filteredHeaders.sort((a, b) => {
    const aI = lookupHeaderOrder(a)

    const bI = lookupHeaderOrder(b)

    let decision = 0
    if (aI > -1 && bI > -1) {
      decision = aI - bI
    } else if (bI > -1) {
      // b is in headerOrder, a is not, so b should be moved downwards
      decision = bI + 1
    } else if (aI > -1) {
      // a is in headerOrder, b is not, so a should be moved upwards
      decision = (aI + 1) * -1
    }
    return decision
  })

  return filteredHeaders
}
