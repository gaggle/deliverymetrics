import * as z from "zod"
import { debug } from "std:log"
import { distinct } from "std:distinct"

import { GithubPull } from "../github/mod.ts"

import { AbortError } from "../errors.ts"
import { Entries, ToTuple } from "../types.ts"

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

export async function first<T>(iter: AsyncIterable<T>): Promise<T | undefined> {
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

export function arraySubtract<
  T1 extends ReadonlyArray<unknown>,
  T2 extends ReadonlyArray<unknown>,
>(array1: T1, array2: T2): ToTuple<Exclude<T1[number], T2[number]>> {
  const subtracted = array1.filter((element) => !array2.includes(element))
  return subtracted as ToTuple<Exclude<T1[number], T2[number]>>
}

export async function* mergeAsyncGenerators<T>(...asyncGenerators: Array<AsyncGenerator<T>>): AsyncGenerator<T> {
  for (const gen of asyncGenerators) {
    for await (const value of gen) {
      yield value
    }
  }
}
