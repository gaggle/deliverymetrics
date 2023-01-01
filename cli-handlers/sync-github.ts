import { join } from "std:path";

import { getGithubClient, GithubClient, GithubDiff } from "../github/mod.ts";
import { withProgress, withSpinner } from "../cli-gui/mod.ts";

import { assertUnreachable, stringifyPull } from "../utils.ts";

import { formatGithubClientStatus, formatGithubSyncResult } from "./formatting.ts";

export async function githubSyncHandler(
  { owner, repo, token, persistenceRoot }: {
    owner: string;
    repo: string;
    token: string;
    persistenceRoot: string;
  },
) {
  let github: GithubClient;
  await withSpinner(async () => {
    github = await _internals.getGithubClient({
      type: "GithubClient",
      persistenceDir: join(persistenceRoot, "github", owner, repo),
      repo,
      owner,
      token,
    });
  }, { start: "Initializing...", succeed: "Initialized", delayFor: 100 });
  console.log(await formatGithubClientStatus(github!));

  let syncResult: GithubDiff;
  await withProgress(async (progress) => {
    syncResult = await github!.sync({
      progress: (el) => {
        const type = el.type;
        switch (type) {
          case "actions-run":
            progress.increment(el.type, { text: `Fetched run ${el.run.run_number} for workflow: ${el.run.name}` });
            break;
          case "actions-workflow":
            progress.increment(el.type, { text: `Fetched workflow: ${el.workflow.name}` });
            break;
          case "commits":
            progress.increment(el.type, { text: `Fetched ${el.commits.length} commits for PR: ${el.pr}` });
            break;
          case "pull":
            progress.increment(el.type, { text: `Fetched pull: ${stringifyPull(el.pull)}` });
            break;
          default:
            return assertUnreachable(type);
        }
      },
    });
  }, {
    title: "↓ Pulling GitHub resources",
    display: "  [:completed completed] :text",
    bars: {
      "pull": { total: Number.MAX_SAFE_INTEGER },
      "commits": { total: Number.MAX_SAFE_INTEGER, text: "<Waiting for pulls...>" },
      "actions-workflow": { total: Number.MAX_SAFE_INTEGER },
      "actions-run": { total: Number.MAX_SAFE_INTEGER, text: "<Waiting for workflows...>" },
    },
  });
  console.log(formatGithubSyncResult(syncResult!));
}

export const _internals = {
  getGithubClient,
};
