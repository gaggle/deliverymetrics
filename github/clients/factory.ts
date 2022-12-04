import { join } from "path";

import { AloeDatabase } from "../../db/mod.ts";

import { assertUnreachable } from "../../utils.ts";

import { boundGithubPullCommit, githubPullSchema, syncInfoSchema } from "../types/mod.ts";

import { AloeGithubClient, ReadonlyAloeGithubClient } from "./aloe-github-client.ts";

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
  const db: ConstructorParameters<typeof AloeGithubClient>[0]["db"] = {
    pullCommits: await AloeDatabase.new({
      path: join(opts.persistenceDir, "pull-commits.json"),
      schema: boundGithubPullCommit,
    }),
    pulls: await AloeDatabase.new({
      path: join(opts.persistenceDir, "pulls.json"),
      schema: githubPullSchema,
    }),
    syncs: await AloeDatabase.new({
      path: join(opts.persistenceDir, "syncs.json"),
      schema: syncInfoSchema,
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
