import { join } from "path";

import { getGithubClient } from "../github/mod.ts";

import { dot, formatGithubClientStatus, formatGithubSyncResult } from "./formatting.ts";
import { assertUnreachable } from "../utils.ts";

export async function githubSyncHandler(
  { owner, repo, token, persistenceRoot }: {
    owner: string;
    repo: string;
    token: string;
    persistenceRoot: string;
  },
) {
  const github = await getGithubClient({
    type: "GithubClient",
    persistenceDir: join(persistenceRoot, "github", owner, repo),
    repo,
    owner,
    token,
  });
  console.log(await formatGithubClientStatus(github));

  const syncResult = await github.sync({
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
