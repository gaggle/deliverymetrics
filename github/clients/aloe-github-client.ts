import { debug } from "log";
import { equal } from "equal";
import { groupBy } from "group-by";

import { AloeDatabase } from "../../db/mod.ts";

import { asyncToArray, first, inspectIter } from "../../utils.ts";

import { fetchPullCommits } from "../utils/fetch-pull-commits.ts";
import { fetchPulls } from "../utils/fetch-pulls.ts";
import { fetchActionRuns } from "../utils/fetch-action-runs.ts";
import { fetchActionWorkflows } from "../utils/fetch-action-workflows.ts";
import { sortPullsByKey } from "../utils/sorting.ts";

import {
  ActionsRun,
  BoundGithubPullCommit,
  GithubClient,
  GithubDiff,
  GithubPull,
  GithubPullDateKey,
  ReadonlyGithubClient,
  SyncInfo,
  SyncProgressParams,
  Workflow,
} from "../types/mod.ts";

interface AloeGithubClientDb {
  pullCommits: AloeDatabase<BoundGithubPullCommit>;
  pulls: AloeDatabase<GithubPull>;
  syncs: AloeDatabase<SyncInfo>;
  actionWorkflows: AloeDatabase<Workflow>;
  actionRuns: AloeDatabase<ActionsRun>;
}

export class ReadonlyAloeGithubClient implements ReadonlyGithubClient {
  readonly repoHtmlUrl: string;

  protected readonly db: AloeGithubClientDb;

  constructor(opts: { db: AloeGithubClientDb; owner: string; repo: string }) {
    this.repoHtmlUrl = `https://github.com/${opts.owner}/${opts.repo}`;
    this.db = opts.db;
  }

  /**
   * Yield pulls
   *
   * Default sort is by `updated_at`
   */
  async *findPulls(
    { sort }: Partial<{ sort: { key: GithubPullDateKey; order?: "asc" | "desc" } }> = {},
  ): AsyncGenerator<GithubPull> {
    const sortedPulls = sortPullsByKey(
      await this.db.pulls.findMany(),
      sort?.key ?? "updated_at",
    );
    if (sort?.order === "desc") {
      sortedPulls.reverse();
    }
    for (const el of sortedPulls) {
      yield el;
    }
  }

  async *findUnclosedPulls(): AsyncGenerator<GithubPull> {
    for (
      const el of (await asyncToArray(this.findPulls())).filter((pull) => pull.state !== "closed")
    ) {
      yield el;
    }
  }

  findLatestPull(): Promise<GithubPull | undefined> {
    return first(
      this.findPulls({ sort: { key: "updated_at", order: "desc" } }),
    );
  }

  async *findPullCommits(opts?: Partial<{ pr: number }>): AsyncGenerator<BoundGithubPullCommit> {
    const pullCommits = await this.db.pullCommits.findMany(opts?.pr ? { pr: opts.pr } : undefined);
    for (const el of pullCommits) {
      yield el;
    }
  }

  async findLatestSync(): Promise<SyncInfo | undefined> {
    const syncs = await this.db.syncs.findMany();
    return syncs[syncs.length - 1];
  }
}

export class AloeGithubClient extends ReadonlyAloeGithubClient implements GithubClient {
  private readonly owner: string;
  private readonly repo: string;
  private readonly token: string;

  constructor(
    opts: {
      db: AloeGithubClientDb;
      owner: string;
      repo: string;
      token: string;
    },
  ) {
    super(opts);
    this.owner = opts.owner;
    this.repo = opts.repo;
    this.token = opts.token;
  }

  async sync(opts: Partial<{ progress: (type: SyncProgressParams) => void }> = {}): Promise<GithubDiff> {
    const { progress } = { progress: () => {}, ...opts };
    const lastSync = await this.findLatestSync();

    const prevPullsByNumber = (await asyncToArray(this.findPulls()))
      .reduce(function (acc, curr) {
        acc[curr.number] = curr;
        return acc;
      }, {} as Record<number, GithubPull>);

    let sync: SyncInfo = await this.db.syncs.insertOne({
      createdAt: Date.now(),
      updatedAt: undefined,
    });

    const fetchedPulls: Array<GithubPull> = [];
    for await (
      const pull of _internals.fetchPulls(this.owner, this.repo, this.token, {
        from: lastSync?.updatedAt,
      })
    ) {
      fetchedPulls.push(pull);
      await this.db.pulls.deleteOne({ number: pull.number });
      await this.db.pulls.insertOne(pull);
      await progress("pull");
    }

    for (const pull of fetchedPulls) {
      const commits = await asyncToArray(
        inspectIter(
          () => progress("commit"),
          _internals.fetchPullCommits({ commits_url: pull.commits_url }, this.token),
        ),
      );
      await this.db.pullCommits.deleteMany({ pr: pull.number });
      debug(`Deleted pull commits bound to pr ${pull.number}`);
      await this.db.pullCommits.insertMany(commits.map((commit) => ({ ...commit, pr: pull.number })));
    }

    for await (const workflow of _internals.fetchActionWorkflows(this.owner, this.repo, this.token)) {
      await this.db.actionWorkflows.deleteOne({ node_id: workflow.node_id });
      await this.db.actionWorkflows.insertOne(workflow);
      await progress("actions-workflow");
    }

    for await (const run of _internals.fetchActionRuns(this.owner, this.repo, this.token)) {
      await this.db.actionRuns.deleteOne({ node_id: run.node_id });
      await this.db.actionRuns.insertOne(run);
      await progress("actions-run");
    }

    sync = await this.db.syncs.updateOne(sync, {
      ...sync,
      updatedAt: Date.now(),
    }) as SyncInfo;

    const bucket = groupBy(
      fetchedPulls,
      (pull) => pull.number in prevPullsByNumber ? "updatedPulls" : "newPulls",
    );

    return {
      syncedAt: sync.createdAt,
      newPulls: sortPullsByKey(bucket.newPulls || []),
      updatedPulls: sortPullsByKey(bucket.updatedPulls || [])
        .filter((updated) => !equal(updated, prevPullsByNumber[updated.number]))
        .map((updated) => ({
          prev: prevPullsByNumber[updated.number],
          updated,
        })),
    };
  }
}

export const _internals = {
  fetchPullCommits,
  fetchPulls,
  fetchActionRuns,
  fetchActionWorkflows,
};
