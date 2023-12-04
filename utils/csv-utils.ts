import { CSVWriteCellOptions, CSVWriterOptions, writeCSVObjects } from "csv"
import { ensureFile } from "std:fs"
import { debug } from "std:log"

import { arraySubtract, mapIter, regexOrStringTestMany, withFileOpen, withTempFile } from "./mod.ts"

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
            const elKeys = Object.keys(el)
            const keysInElNotUsedByHeader = arraySubtract(elKeys, options.header)
            if (hasIterated === false && keysInElNotUsedByHeader.length > 0) {
              debug(`${fp} discards these keys: ${keysInElNotUsedByHeader.join(", ")}`)
            }

            hasIterated = true

            const keysSpecifiedInHeaderButNotInEl = arraySubtract(options.header, elKeys)
            for (const key of keysSpecifiedInHeaderButNotInEl) {
              el[key] = ""
            }

            for (const [key, val] of Object.entries(el)) {
              if (val === null) {
                delete el[key]
              }
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
 * Reorganizes an array of header strings by including/excluding specified headers and
 * ordering remaining headers according to a given order.
 *
 * Note: If a header is both included and excluded then it will be included.
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
  { headerOrder = [], ignoreHeaders = [], includeHeaders = [] }: {
    headerOrder?: Array<string | RegExp>
    ignoreHeaders?: Array<string | RegExp>
    includeHeaders?: Array<string | RegExp>
  },
): Array<string> {
  let filteredHeaders = [...headers]

  filteredHeaders = filteredHeaders.filter((el) => {
    if (regexOrStringTestMany(el, includeHeaders)) return true
    if (regexOrStringTestMany(el, ignoreHeaders)) return false
    return true
  })

  const lookupHeaderOrderIndex = (el: string) => {
    const strIdx = headerOrder.indexOf(el)
    const regIdx = headerOrder.findIndex((re) => re instanceof RegExp && re.test(el))
    return Math.max(strIdx, regIdx)
  }

  filteredHeaders.sort((a, b) => {
    const aI = lookupHeaderOrderIndex(a)
    const bI = lookupHeaderOrderIndex(b)

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
