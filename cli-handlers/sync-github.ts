import { join } from "path";

import { getAloeGithubClient } from "../github/mod.ts";

import { dot, formatGithubClientStatus, formatGithubSyncResult } from "./formatting.ts";

export async function githubSyncHandler(
  { owner, repo, token, persistenceRoot }: {
    owner: string;
    repo: string;
    token: string;
    persistenceRoot: string;
  },
) {
  const github = await getAloeGithubClient({
    type: "AloeGithubClient",
    persistenceDir: join(persistenceRoot, "github", owner, repo),
    repo,
    owner,
    token,
  });
  console.log(await formatGithubClientStatus(github));

  const syncResult = await github.sync({ progress: dot });
  console.log(""); // End the dot progress

  console.log(formatGithubSyncResult(syncResult));
}
