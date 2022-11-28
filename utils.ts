import * as z from "zod";

import { GithubPull } from "./github/mod.ts";

export async function asyncToArray<T>(
  iter: AsyncIterable<T>,
): Promise<Array<T>> {
  const arr = [];
  for await (const el of iter) {
    arr.push(el);
  }
  return arr;
}

export async function* limit<T>(
  iter: AsyncIterable<T>,
  maxItems: number,
): AsyncIterable<T> {
  let count = 0;
  for await (const el of iter) {
    yield el;
    count++;
    if (count >= maxItems) {
      break;
    }
  }
}

export async function first<T>(iter: AsyncIterable<T>): Promise<T | undefined> {
  // noinspection LoopStatementThatDoesntLoopJS
  for await (const el of iter) {
    return el;
  }
}

export async function last<T>(iter: AsyncIterable<T>): Promise<T | undefined> {
  let lastEl: T | undefined = undefined;
  for await (const el of iter) {
    lastEl = el;
  }
  return lastEl;
}

export async function* arrayToAsyncGenerator<T>(
  array: Array<T>,
): AsyncGenerator<T> {
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
  collection: Array<unknown>,
  {
    empty,
    singular,
    plural,
  }: { empty: () => string; singular: () => string; plural: () => string },
) {
  if (collection.length > 1) {
    return plural();
  }

  if (collection.length === 1) {
    return singular();
  }

  return empty();
}

export const zodCastToString = z.preprocess(
  (val) => val === undefined ? val : String(val),
  z.string(),
);

export function stringifyPull(pull: GithubPull): string {
  return `#${pull.number} (${
    pull.draft ? "draft" : pull.state
  }) ${pull._links.html.href}`;
}

export function stringifyUpdatedPull(
  { prev, updated }: { prev: GithubPull; updated: GithubPull },
): string {
  return `#${updated.number} (${prev.draft ? "draft" : prev.state} -> ${
    updated.draft ? "draft" : updated.state
  }) ${updated._links.html.href}`;
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
  throw new Error("Unreachable");
}
