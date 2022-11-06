import { SyncableGithubClient, GithubDiskCache } from "../github/mod.ts";
import { path } from "../deps.ts";

import { formatGithubClientStatus, formatGithubSyncResult } from "./formatting.ts";

export async function githubSyncHandler(
  { owner, repo, token, root }: { owner: string, repo: string, token: string, root: string }) {
  const github = new SyncableGithubClient({
    cache: await GithubDiskCache.init(path.join(root, "data", "github", owner, repo)),
    owner,
    repo,
    token
  });
  console.log(await formatGithubClientStatus(github));

  const syncResult = await github.sync();
  console.log(formatGithubSyncResult(syncResult));
}
