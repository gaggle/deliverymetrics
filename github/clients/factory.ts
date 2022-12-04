import { AloeDatabase } from "../../db/aloe-database.ts";
import { join } from "path";
import { syncInfoSchema } from "../types/sync-info.ts";
import { githubPullSchema } from "../types/github-pull.ts";
import { AloeGithubClient, ReadonlyAloeGithubClient } from "./aloe-github-client.ts";
import { assertUnreachable } from "../../utils.ts";

interface BaseOpts {
  persistenceDir: string;
  owner: string;
  repo: string;
}

type AloeGithubClientOpts = BaseOpts & {
  type: "AloeGithubClient";
  token: string;
};
type ReadonlyAloeGithubClientOpts = BaseOpts & {
  type: "ReadonlyAloeGithubClient";
  token?: never;
};

export async function getAloeGithubClient(opts: AloeGithubClientOpts): Promise<AloeGithubClient>;
export async function getAloeGithubClient(opts: ReadonlyAloeGithubClientOpts): Promise<ReadonlyAloeGithubClient>;
export async function getAloeGithubClient(
  opts: AloeGithubClientOpts | ReadonlyAloeGithubClientOpts,
): Promise<AloeGithubClient | ReadonlyAloeGithubClient> {
  const db = {
    syncs: await AloeDatabase.new({
      path: join(opts.persistenceDir, "syncs.json"),
      schema: syncInfoSchema,
    }),
    pulls: await AloeDatabase.new({
      path: join(opts.persistenceDir, "pulls.json"),
      schema: githubPullSchema,
    }),
  };

  const { type } = opts;
  switch (type) {
    case "AloeGithubClient":
      return new AloeGithubClient({
        db,
        owner: opts.owner,
        repo: opts.repo,
        token: opts.token,
      });
    case "ReadonlyAloeGithubClient":
      return new ReadonlyAloeGithubClient({
        db,
        owner: opts.owner,
        repo: opts.repo,
      });
    default:
      assertUnreachable(type);
  }
}
