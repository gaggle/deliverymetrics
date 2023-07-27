import type SemVer from "tea-semver"

import { brightRed } from "std:color"
import { debug, getLogger, Logger } from "std:log"
import { distinct } from "std:distinct"
import { parse } from "tea-semver"
import { z } from "zod"

import { GithubPull } from "../github/api/pulls/mod.ts"

import { FetchExhaustivelyProgress } from "../fetching/mod.ts"

import { AbortError } from "../errors.ts"
import { Entries } from "../types.ts"

export async function asyncToArray<T>(
  iter: AsyncIterable<T>,
): Promise<Array<T>> {
  const arr = []
  for await (const el of iter) {
    arr.push(el)
  }
  return arr
}

export async function* limit<T>(
  iter: AsyncIterable<T>,
  maxItems: number,
): AsyncIterable<T> {
  let count = 0
  for await (const el of iter) {
    yield el
    count++
    if (count >= maxItems) {
      break
    }
  }
}

export async function first<T>(iter: AsyncIterable<T>): Promise<T> {
  // noinspection LoopStatementThatDoesntLoopJS
  for await (const el of iter) {
    return el
  }
  throw new Error("")
}

export async function firstMaybe<T>(iter: AsyncIterable<T>): Promise<T | undefined> {
  // noinspection LoopStatementThatDoesntLoopJS
  for await (const el of iter) {
    return el
  }
}

export async function last<T>(iter: AsyncIterable<T>): Promise<T | undefined> {
  let lastEl: T | undefined = undefined
  for await (const el of iter) {
    lastEl = el
  }
  return lastEl
}

export function single<T>(iter: Iterable<T> | Array<T>): T {
  let firstEl: T | undefined = undefined
  // noinspection LoopStatementThatDoesntLoopJS
  for (const el of iter) {
    if (firstEl) {
      throw new Error("too many values to unpack")
    }
    firstEl = el
  }
  if (firstEl === undefined) {
    throw new Error("not enough values to unpack")
  }
  return firstEl
}

export async function asyncSingle<T>(iter: AsyncIterable<T> | Array<T>): Promise<T> {
  let firstEl: T | undefined = undefined
  // noinspection LoopStatementThatDoesntLoopJS
  for await (const el of iter) {
    if (firstEl) {
      throw new Error("too many values to unpack")
    }
    firstEl = el
  }
  if (firstEl === undefined) {
    throw new Error("not enough values to unpack")
  }
  return firstEl
}

export async function* arrayToAsyncGenerator<T>(
  array: Array<T>,
): AsyncGenerator<T> {
  for (const el of array) {
    yield el
  }
}

export function sleep(ms = 1000, { signal }: { signal?: AbortSignal } = {}): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AbortError(signal?.reason))
      return
    }

    const abortListener = () => {
      clearTimeout(t)
      signal?.removeEventListener("abort", abortListener)
      reject(new AbortError(signal?.reason))
    }
    signal?.addEventListener("abort", abortListener)

    const t = setTimeout(() => {
      signal?.removeEventListener("abort", abortListener)
      resolve()
    }, ms)
  })
}

export function getEnv(key: string) {
  const val = Deno.env.get(key)
  if (!val) throw new Error(`Required environment variable missing: ${key}`)
  return val
}

export function pluralize(
  collection: Array<unknown>,
  {
    empty,
    singular,
    plural,
  }: { empty: () => string; singular: () => string; plural: () => string },
) {
  if (collection.length > 1) {
    return plural()
  }

  if (collection.length === 1) {
    return singular()
  }

  return empty()
}

export const zodCastToString = z.preprocess(
  (val) => val === undefined ? val : String(val),
  z.string(),
)

export function stringifyPull(pull: GithubPull): string {
  return `#${pull.number} (${pull.draft ? "draft" : pull.state}) ${pull._links.html.href}`
}

export function stringifyUpdatedPull(
  { prev, updated }: { prev: GithubPull; updated: GithubPull },
): string {
  return `#${updated.number} (${prev.draft ? "draft" : prev.state} -> ${
    updated.draft ? "draft" : updated.state
  }) ${updated._links.html.href}`
}

/**
 * Use in the default case (or equivalently outside the switch):
 *
 * ```ts
 * function getColorName(c: Color): string {
 *     switch(c) {
 *         case Color.Red:
 *             return 'red';
 *         case Color.Green:
 *             return 'green';
 *     }
 *     return assertUnreachable(c);
 * }
 * ```
 */
export function assertUnreachable(_: never): never {
  throw new Error("Unreachable")
}

export async function* inspectIter<T>(
  callback: (el: T, index: number) => void,
  iter: AsyncGenerator<T>,
): AsyncGenerator<T> {
  let idx = 0
  for await (const el of iter) {
    callback(el, idx++)
    yield el
  }
}

export async function* filterIter<T>(
  predicate: (value: T, index: number) => boolean,
  iter: AsyncGenerator<T>,
): AsyncGenerator<T> {
  let idx = 0
  for await (const el of iter) {
    if (!predicate(el, idx++)) {
      continue
    }
    yield el
  }
}

export async function* mapIter<TInput, TOut>(
  transformer: (value: TInput, index: number) => TOut,
  iter: AsyncGenerator<TInput>,
): AsyncGenerator<TOut> {
  let idx = 0
  for await (const el of iter) {
    yield transformer(el, idx++)
  }
}

/**
 * A throttled function that will only be invoked at most once per
 * every `wait` milliseconds.
 */
export interface ThrottledFunction<Args extends Array<unknown>> {
  (...args: Args): void
}

/**
 * Creates a throttled function that only invokes at most once per
 * every `wait` milliseconds. That is, the function will not execute
 * more than once every X milliseconds, even if called repeatedly.
 *
 * @param fn    The function to throttle.
 * @param wait  The time in milliseconds to delay the function.
 */
// deno-lint-ignore no-explicit-any
export function throttle<Args extends Array<any>>(
  fn: (this: ThrottledFunction<Args>, ...args: Args) => void,
  wait: number,
) {
  let timeout: ReturnType<typeof setTimeout> | undefined = undefined
  let lastTime: number

  function isNotThrottled(): boolean {
    if (lastTime === undefined) {
      return true
    }
    return Date.now() - lastTime >= wait
  }

  function timeUntilNotThrottled(): number {
    return Math.max(wait - (Date.now() - lastTime), 0)
  }

  function invoke(...args: Args) {
    fn.call(throttled, ...args)
    lastTime = Date.now()
  }

  const throttled: ThrottledFunction<Args> = (...args: Args) => {
    debug({
      now: Date.now(),
      lastTime,
      wait,
      timeout,
      isNotThrottled: isNotThrottled(),
      timeUntilNotThrottled: timeUntilNotThrottled(),
    })

    // If not throttled, clear any timeouts and invoke
    if (isNotThrottled()) {
      clearTimeout(timeout)
      timeout = undefined
      invoke(...args)
      return
    }

    // If throttled, scheduled an invocation when throttling expires
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      if (isNotThrottled()) {
        invoke(...args)
      }
    }, timeUntilNotThrottled())
  }

  return throttled
}

export function regexIntersect(
  originalHead: readonly string[],
  ...rest: Array<(readonly (string | RegExp)[])>
): string[] {
  const head = [...new Set(originalHead)]
  const tailSets = rest.map((it) => new Set(it))

  for (const tail of tailSets) {
    filterInPlace(head, (headEl): boolean => {
      for (const tailEl of tail.values()) {
        if (tailEl instanceof RegExp ? tailEl.test(headEl) : tailEl === headEl) {
          return true
        }
      }
      return false
    })
    if (head.length === 0) return head
  }

  return head
}

/**
 * From https/deno.land/std@0.171.0/collections/_utils.ts
 */
function filterInPlace<T>(
  array: Array<T>,
  predicate: (el: T) => boolean,
): Array<T> {
  let outputIndex = 0

  for (const cur of array) {
    if (!predicate(cur)) {
      continue
    }

    array[outputIndex] = cur
    outputIndex += 1
  }

  array.splice(outputIndex)

  return array
}

export const getEntries = <T extends Record<string, unknown>>(obj: T) => Object.entries(obj) as Entries<T>

export function hasDupes<T>(arr: Array<T>): boolean {
  return distinct(arr).length !== arr.length
}

export function mapFilter<From, To>(from: Array<From>, callbackfn: (el: From) => To | undefined): Array<To> {
  return from
    .map((el) => callbackfn(el))
    .filter((el): el is To => el !== undefined)
}

export async function* mergeAsyncGenerators<T>(...asyncGenerators: Array<AsyncGenerator<T>>): AsyncGenerator<T> {
  for (const gen of asyncGenerators) {
    for await (const value of gen) {
      yield value
    }
  }
}

/**
 * Flatten an object to a single level, with sub-object keys separated by a dot
 */
export function flattenObject<T extends NestedObject<unknown>>(obj: T): Record<string, z.Scalars> {
  function inner<T extends Record<string, unknown>>(
    obj: T,
    prefix = "",
    result: Record<string, z.Scalars> = {},
  ): Record<string, z.Scalars> {
    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
        const newKey = prefix ? `${prefix}.${key}` : key
        const value = obj[key as keyof T]

        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value) &&
          value instanceof Object
        ) {
          inner(value as Record<string, z.Scalars>, newKey, result)
        } else {
          result[newKey] = value as unknown as z.Scalars
        }
      }
    }

    return result
  }

  return inner(obj)
}

type NestedObject<T> = { [key: string]: NestedObject<T> | T } | Record<string, T>

export function extractZodSchemaKeys<T extends z.ZodObject<Shape>, Shape extends z.ZodRawShape>(
  schema: T,
): NestedObject<string>
export function extractZodSchemaKeys<T extends z.ZodTypeAny>(schema: T): NestedObject<string> | string
export function extractZodSchemaKeys<T extends z.ZodTypeAny>(schema: T): NestedObject<string> | string {
  /**
   * Recursively extracts the inner types of a Zod schema.
   */
  function inner<U extends z.ZodTypeAny>(schema: U): NestedObject<string> | string {
    // There is a special union edge-case where it has a single proper type and one ZodNull,
    // in that case we should recursively extract the inner type because it mirrors the .nullable()/.optional() behavior
    if (
      schema instanceof z.ZodUnion &&
      schema._def.options.length === 2 &&
      schema._def.options.some((el: unknown) => el instanceof z.ZodNull)
    ) {
      return inner(schema._def.options[schema._def.options[0] instanceof z.ZodNull ? 1 : 0])
    }

    // An optional or nullable type covers up a proper inner type which we need to extract
    if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
      return inner(schema._def.innerType)
    }

    // An object needs to be recursively extracted
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape
      const result: NestedObject<string> = {}
      for (const key in shape) {
        if (!Object.hasOwn(shape, key)) continue
        result[key] = inner(shape[key])
      }
      return result
    }

    // Normal unions can't be extracted because they could contain anything, so we just return the union name
    if (schema instanceof z.ZodUnion) {
      return `${getZodName(schema)} ${schema._def.options.map((el: z.ZodTypeAny) => getZodName(el)).join(" ")}`
    }

    // In all other cases just return the name of the type
    return getZodName(schema)
  }

  return inner(schema)
}

function getZodName(schema: z.ZodTypeAny): string {
  let msg = schema.constructor.name

  if (schema instanceof z.ZodLiteral) {
    msg += `(${schema._def.value})`
  }

  return msg
}

type StringifyObjectOpts = Partial<{ stringifyUndefined: boolean }>

export function stringifyObject<T>(obj: Record<string, z.Scalars>, opts?: StringifyObjectOpts): Record<string, string>
export function stringifyObject<T>(obj: NestedObject<T>, opts?: StringifyObjectOpts): NestedObject<string>
export function stringifyObject<T>(obj: NestedObject<T>, opts: StringifyObjectOpts = {}): NestedObject<string> {
  function stringifyLeafNode(value: unknown): NestedObject<string> | string {
    if (typeof value === "string") {
      return value
    } else if (value instanceof Date) {
      return value.toISOString()
    } else if (Array.isArray(value)) {
      return value.map((el) => JSON.stringify(stringifyLeafNode(el))).join("; ")
    } else if (isPlainObject(value)) {
      return stringifyObject(value)
    } else if (value === undefined && opts.stringifyUndefined) {
      return ""
    } else {
      return JSON.stringify(value)
    }
  }

  const result: NestedObject<string> = {}
  for (const [key, val] of Object.entries(obj)) {
    result[key] = stringifyLeafNode(val)
  }
  return JSON.parse(JSON.stringify(result))
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date)
}

/**
 * A RegExp object to match strings that follow the pattern of a regular expression
 * (i.e., start and end with a forward slash)
 */
const regexLikePattern = new RegExp("^/.*/$")

/**
 * Determines if a given string follows the pattern of a regular expression
 * (i.e., starts and ends with a forward slash).
 *
 * @example
 * isRegexLike('/abc/'); // Returns: true
 * isRegexLike('def');   // Returns: false
 */
export function isRegexLike(regexLike: string): boolean {
  return regexLikePattern.test(regexLike)
}

/**
 * Parses a regex-like string (i.e., starts and ends with a forward slash)
 * and returns a RegExp object. Throws error if input string is not regex-like.
 *
 * @example
 * parseRegexLike('/abc/'); // Returns: RegExp(/abc/)
 * parseRegexLike('def'); // Throws: Deno.errors.InvalidData: Not regex-like: def
 */
export function parseRegexLike(regexLike: string): RegExp {
  if (!isRegexLike(regexLike)) {
    throw new Deno.errors.InvalidData(`Not regex-like: ${regexLike}`)
  }
  return new RegExp(regexLike.slice(1, -1))
}

type FilterUndefined<T> = Omit<T, { [K in keyof T]: T[K] extends undefined ? K : never }[keyof T]>

export function filterUndefined<T extends { [key: string]: unknown }>(obj: T): FilterUndefined<T> {
  for (const key of Object.keys(obj)) {
    if (obj[key] === undefined) {
      delete obj[key]
    }
  }
  return obj
}

export function stringToStream(content: string): ReadableStream<Uint8Array> {
  // Encode the string to a Uint8Array
  const array = new TextEncoder().encode(content)

  // Create a readable stream
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(array)
      controller.close()
    },
  })

  return stream
}

export async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  let chunks: Array<number> = []
  for await (const chunk of stream) {
    chunks = chunks.concat(...chunk)
  }
  return String.fromCharCode(...new Uint8Array(chunks))
}

export function isDebugLoggingActive(logger?: Logger): boolean {
  return (logger || getLogger()).level <= 10
}

export async function timeCtx(msg: string, fn: () => Promise<unknown>) {
  const start = new Date().getTime()
  await fn()
  const duration = (new Date().getTime() - start) / 1000
  const durationStr = duration > 10 ? brightRed(`${(duration.toFixed(2))}s`) : `${(duration.toFixed(2))}s`
  debug(`${msg} (${durationStr})`)
}

export async function hash(message: string): Promise<string> {
  const data = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export function stdFetchExhaustivelyProgressLogging(call: FetchExhaustivelyProgress): void {
  switch (call.type) {
    case "paging":
      debug(`${call.type}: ${call.to.url} (${call.pagesConsumed}/${call.maxPages})`)
      break
    case "retrying":
      debug(`${call.type} in ${(call.delay / 1000).toFixed(2)}s: ${call.reason} (${call.retry}/${call.retries})`)
      break
  }
}

export function sortObject<T = unknown>(obj: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(obj).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)))
}

/**
 * Takes in an object and a callback,
 * applies the callback to each key-value pair in the object,
 * and constructs a new object from the results.
 *
 * If the callback returns undefined for the key or value it'll default to the original key or value in those cases.
 *
 * This function is a powerful utility that can be used to transform the keys and/or values of an object in a variety of ways.
 * - ChatGPT
 */
export function mapObject<
  Val,
  Key extends string | number | symbol,
  NewVal,
  NewKey extends string | number | symbol = Key,
>(
  obj: Record<Key, Val>,
  callback: (params: { key: Key; val: Val }) => { key?: NewKey; val?: NewVal } | void,
): Record<NewKey, NewVal> {
  const result: Record<NewKey, NewVal> = {} as Record<NewKey, NewVal>
  for (const [key, val] of Object.entries(obj)) {
    const transformed = callback({ key: key as Key, val: val as Val })
    const { key: newKey = key as Key, val: newValue = val as Val } = transformed || {}
    result[newKey as NewKey] = newValue as NewVal
  }
  return result
}

export function filterObject<Val, Key extends string | number | symbol>(
  obj: Record<Key, Val>,
  callback: (params: { key: Key; val: Val }) => boolean,
): Record<string, Val> {
  const result: Record<Key, Val> = {} as Record<Key, Val>
  for (const [key, val] of Object.entries(obj)) {
    const keep = callback({ key: key as Key, val: val as Val })
    if (keep) {
      result[key as Key] = val as Val
    }
  }
  return result
}

export function pick<T extends Record<K, unknown>, K extends keyof T>(obj: T, ...keys: K[]) {
  return Object.fromEntries(keys.filter((key) => key in obj).map((key) => [key, obj[key]])) as Pick<T, K>
}

export function omit<T extends Record<K, unknown>, K extends keyof T>(obj: T, ...keys: K[]) {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key as K))) as Omit<T, K>
}

export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max)
}

export function extractSemVers(str: string): Array<SemVer> {
  return str.split(" ")
    .map((el) => el.trim())
    .map((el) => parse(el))
    .filter((el) => !!el) as Array<SemVer>
}
