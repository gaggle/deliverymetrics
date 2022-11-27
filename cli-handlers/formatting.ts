import { ReadonlyGithubClient, GithubPull, GithubClient } from "../github/mod.ts";

import { asyncToArray, pluralize, stringifyPull, stringifyUpdatedPull } from "../utils.ts";

export async function formatGithubClientStatus(github: ReadonlyGithubClient,
                                               opts: Partial<{ mostRecent: boolean, unclosed: boolean }> = {}): Promise<string> {
  let msg = `Github client cache report:`;

  const lastSynced = (await github.findLatestSync() || {}).updatedAt;
  msg += `\n  Last synced: ${lastSynced ? new Date(lastSynced).toLocaleString() : "never"}`;

  msg += `\n  Number of cached pulls: ${(await asyncToArray(github.findPulls())).length}`;

  if (opts.mostRecent ?? true) {
    const mostRecentPull = await github.findLatestPull();
    msg += mostRecentPull ? `\n  Most recent pull: ${stringifyPull(mostRecentPull)}` : "";
  }

  if (opts.unclosed ?? true) {
    const unclosedPulls = await asyncToArray(github.findUnclosedPulls());
    msg += pluralize(unclosedPulls, {
      empty: () => "",
      singular: () => `\n  1 unclosed pull is cached:\n    ${unclosedPulls.map(stringifyPull).join("\n    ")}`,
      plural: () => `\n  ${unclosedPulls.length} unclosed pulls are cached:\n    ${unclosedPulls.map(stringifyPull).join("\n    ")}`
    });
  }

  return msg;
}

export function formatGithubSyncResult(diff: Awaited<ReturnType<GithubClient["sync"]>>): string {
  let msg = `Github client sync report from: ${new Date(diff.syncedAt).toLocaleString()}`;

  msg += pluralize(
    diff.newPulls,
    {
      empty: () => "\n  Found no new pulls",
      singular: () => `\n  Found 1 new pull:\n    ${diff.newPulls.map(stringifyPull).join("\n    ")}`,
      plural: () => `\n  Found ${diff.newPulls.length} new pulls:\n    ${diff.newPulls.map(stringifyPull).join("\n    ")}`
    },
  );

  msg += pluralize(diff.updatedPulls, {
    empty: () => "\n  Found no updated pulls",
    singular: () => `\n  Found 1 updated pull:\n    ${diff.updatedPulls.map(({ updated }) => stringifyPull(updated)).join("\n    ")}`,
    plural: () => `\n  Found ${diff.updatedPulls.length} updated pulls: ${diff.updatedPulls.map(({ updated }) => stringifyPull(updated)).join("\n    ")}`
  });

  const changedStates = diff.updatedPulls.filter(
    (el): el is { prev: GithubPull, updated: GithubPull } => el.prev ? el.prev.state !== el.updated.state : false
  );
  msg += pluralize(changedStates, {
    empty: () => diff.updatedPulls.length ? "\n  No updated pull changed state" : "",
    singular: () => (diff.updatedPulls.length === 1 ? "\n  And it changed state:\n    " : "\n  And 1 changed state:\n    ") + changedStates.map(stringifyUpdatedPull).join("\n    "),
    plural: () => `\n  And ${changedStates.length} changed state:\n    ${changedStates.map(stringifyUpdatedPull).join("\n    ")}`
  });
  return msg;
}
