import { join } from "path";

import { AloeDatabase } from "../../db/mod.ts";

import { assertUnreachable } from "../../utils.ts";

import {
  boundGithubPullCommit,
  GithubClient,
  githubPullSchema,
  ReadonlyGithubClient,
  syncInfoSchema,
  workflowSchema,
} from "../types/mod.ts";

import { AloeGithubClient, ReadonlyAloeGithubClient } from "./aloe-github-client.ts";

interface BaseOpts {
  persistenceDir: string;
  owner: string;
  repo: string;
}

type GithubClientOpts = BaseOpts & {
  type: "GithubClient";
  token: string;
};

type ReadonlyGithubClientOpts = BaseOpts & {
  type: "ReadonlyGithubClient";
  token?: never;
};

export async function getGithubClient(opts: GithubClientOpts): Promise<GithubClient>;
export async function getGithubClient(opts: ReadonlyGithubClientOpts): Promise<ReadonlyGithubClient>;
export async function getGithubClient(
  opts: GithubClientOpts | ReadonlyGithubClientOpts,
): Promise<GithubClient | ReadonlyGithubClient> {
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
    workflows: await AloeDatabase.new({
      path: join(opts.persistenceDir, "workflows.json"),
      schema: workflowSchema,
    }),
  };

  const { type } = opts;
  switch (type) {
    case "GithubClient":
      return new AloeGithubClient({
        db,
        owner: opts.owner,
        repo: opts.repo,
        token: opts.token,
      });
    case "ReadonlyGithubClient":
      return new ReadonlyAloeGithubClient({
        db,
        owner: opts.owner,
        repo: opts.repo,
      });
    default:
      assertUnreachable(type);
  }
}
