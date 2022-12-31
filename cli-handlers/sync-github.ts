import { join } from "path";

import { getGithubClient, GithubClient } from "../github/mod.ts";
import { withSpinner } from "../cli-gui/mod.ts";

import { assertUnreachable } from "../utils.ts";

import { dot, formatGithubClientStatus, formatGithubSyncResult } from "./formatting.ts";

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

  const syncResult = await github!.sync({
    progress: (type) => {
      switch (type) {
        case "actions-run":
          return dot("r");
        case "actions-workflow":
          return dot("w");
        case "commit":
          return dot("c");
        case "pull":
          return dot("p");
        default:
          return assertUnreachable(type);
      }
    },
  });
  console.log(""); // End the dot progress
  console.log(formatGithubSyncResult(syncResult));
}

export const _internals = {
  getGithubClient,
};
