import { writeAllSync as streamWriteAllSync } from "std:streams"

import { ReadonlyGithubClient } from "../../libs/github/mod.ts"

import { asyncToArray, pluralize, stringifyPull } from "../../utils/mod.ts"

export async function formatGithubClientStatus(
  github: ReadonlyGithubClient,
  opts: Partial<{ mostRecent: boolean; unclosed: boolean }> = {},
): Promise<string> {
  let msg = `ℹ Github client cache report:`

  const lastSynced = (await github.findLatestSync() || {}).updatedAt
  msg += `\n  Last synced: ${lastSynced ? new Date(lastSynced).toLocaleString() : "never"}`

  msg += `\n  Number of cached pulls: ${(await asyncToArray(github.findPulls())).length}`

  if (opts.mostRecent ?? true) {
    const mostRecentPull = await github.findLatestPull()
    msg += mostRecentPull ? `\n  Most recent pull: ${stringifyPull(mostRecentPull)}` : ""
  }

  if (opts.unclosed ?? true) {
    const unclosedPulls = await asyncToArray(github.findUnclosedPulls())
    msg += pluralize(unclosedPulls, {
      empty: () => "",
      singular: () => `\n  1 unclosed pull is cached:\n    ${unclosedPulls.map(stringifyPull).join("\n    ")}`,
      plural: () =>
        `\n  ${unclosedPulls.length} unclosed pulls are cached:\n    ${
          unclosedPulls.map(stringifyPull).join("\n    ")
        }`,
    })
  }

  return msg
}

export function write(content: string, { _stdOutLike }: Partial<{ _stdOutLike: Deno.WriterSync }> = {}): void {
  streamWriteAllSync(_stdOutLike || Deno.stdout, new TextEncoder().encode(`${content}\n`))
}

export function dot({ char, _stdOutLike }: Partial<{ char: string; _stdOutLike: Deno.WriterSync }> = {}): void {
  streamWriteAllSync(_stdOutLike || Deno.stdout, new TextEncoder().encode(char || "."))
}
