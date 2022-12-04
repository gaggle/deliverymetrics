import { join } from "path";

import { AloeDatabase } from "../db/mod.ts";
import { AloeGithubClient, githubPullSchema, syncInfoSchema } from "../github/mod.ts";

import { dot, formatGithubClientStatus, formatGithubSyncResult } from "./formatting.ts";

export async function githubSyncHandler(
  { owner, repo, token, persistenceRoot }: {
    owner: string;
    repo: string;
    token: string;
    persistenceRoot: string;
  },
) {
  const github = new AloeGithubClient({
    db: {
      syncs: await AloeDatabase.new({
        path: join(persistenceRoot, "github", owner, repo, "syncs.json"),
        schema: syncInfoSchema,
      }),
      pulls: await AloeDatabase.new({
        path: join(persistenceRoot, "github", owner, repo, "pulls.json"),
        schema: githubPullSchema,
      }),
    },
    owner,
    repo,
    token,
  });
  console.log(await formatGithubClientStatus(github));

  const syncResult = await github.sync({ progress: dot });
  console.log(""); // End the dot progress

  console.log(formatGithubSyncResult(syncResult));
}
