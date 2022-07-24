import { z } from "./deps.ts";
import { GithubPull } from "./github/mod.ts";

export async function asyncToArray<T>(iter: AsyncGenerator<T> | AsyncIterable<T>): Promise<Array<T>> {
  const arr = [];
  for await(const el of iter) {
    arr.push(el);
  }
  return arr;
}

export function limit<T>(iter: AsyncGenerator<T>, maxItems: number): AsyncGenerator<T>
export function limit<T>(iter: AsyncIterable<T>, maxItems: number): AsyncIterable<T>
export async function * limit<T>(iter: AsyncGenerator<T> | AsyncIterable<T>, maxItems: number): AsyncGenerator<T> | AsyncIterable<T> {
  let count = 0;
  for await(const el of iter) {
    yield el;
    count++;
    if (count >= maxItems) {
      break;
    }
  }
}

export async function * arrayToAsyncGenerator<T>(array: Array<T>): AsyncGenerator<T> {
  for (const el of array) {
    yield el;
  }
}

export function sleep(ms = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getEnv(key: string) {
  const val = Deno.env.get(key);
  if (!val) throw new Error(`Required environment variable missing: ${key}`);
  return val;
}

export function pluralize(
  collection: Array<unknown>, {
    empty,
    singular,
    plural
  }: { empty: () => string, singular: () => string, plural: () => string }) {

  if (collection.length > 1) {
    return plural();
  }

  if (collection.length === 1) {
    return singular();
  }

  return empty();
}

export const zodCastToString = z.preprocess((val) => val === undefined ? val : String(val), z.string());

export function stringifyPull(pull: GithubPull): string {
  return `#${pull.number} (${pull.draft ? "draft" : pull.state}) ${pull._links.html.href}`;
}

export function stringifyUpdatedPull({ prev, updated }: { prev: GithubPull, updated: GithubPull }): string {
  return `#${updated.number} (${prev.draft ? "draft" : prev.state} -> ${updated.draft ? "draft" : updated.state}) ${updated._links.html.href}`;
}

type UnionToParm<U> = U extends unknown ? (k: U) => void : never;
type UnionToSect<U> = UnionToParm<U> extends (k: infer I) => void ? I : never;
type ExtractParm<F> = F extends { (a: infer A): void } ? A : never;

type SpliceOne<Union> = Exclude<Union, ExtractOne<Union>>;
type ExtractOne<Union> = ExtractParm<UnionToSect<UnionToParm<Union>>>;

type ToTupleRec<Union, Rslt extends unknown[]> = SpliceOne<Union> extends never
  ? [ExtractOne<Union>, ...Rslt]
  : ToTupleRec<SpliceOne<Union>, [ExtractOne<Union>, ...Rslt]>;
/**
 * Create constant array type from object type.
 *
 * e.g.:
 * ```ts
 * type Obj = { foo: string, bar: number }
 * type Keys:["foo", "bar"] = ToTuple<keyof Obj>
 *
 * ```
 */
export type ToTuple<Union> = ToTupleRec<Union, []>;
