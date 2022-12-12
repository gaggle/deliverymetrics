import * as z from "zod";

import { actionsRunSchema } from "./github-actions-run.ts";
import { GithubPull, githubPullSchema } from "./github-pull.ts";
import { githubPullCommitSchema } from "./github-pull-commit.ts";
import { workflowSchema } from "./github-workflow.ts";

export const githubRestSpec = {
  /**
   * https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2022-11-28#list-workflow-runs-for-a-repository
   */
  actionRuns: {
    getUrl: (owner: string, repo: string) =>
      new URL(`https://api.github.com/repos/${owner}/${repo}/actions/runs`).toString(),
    schema: z.object({ total_count: z.number().int(), workflow_runs: z.array(actionsRunSchema) }),
  },
  /**
   * https://docs.github.com/en/rest/actions/workflows?apiVersion=2022-11-28
   */
  actionWorkflows: {
    getUrl: (owner: string, repo: string) =>
      new URL(`https://api.github.com/repos/${owner}/${repo}/actions/workflows`).toString(),
    schema: z.object({ total_count: z.number().int(), actionWorkflows: z.array(workflowSchema) }),
  },
  /**
   * https://docs.github.com/en/rest/pulls/pulls#list-commits-on-a-pull-request
   */
  pullCommits: {
    getUrl: (pull: Pick<GithubPull, "commits_url">) => pull.commits_url,
    schema: z.array(githubPullCommitSchema),
  },
  /**
   * https://docs.github.com/en/rest/pulls/pulls
   */
  pulls: {
    getUrl: (owner: string, repo: string) => {
      const url = new URL(`https://api.github.com/repos/${owner}/${repo}/pulls`);
      url.searchParams.set("state", "all");
      url.searchParams.set("sort", "updated");
      url.searchParams.set("direction", "desc");
      return url.toString();
    },
    schema: z.array(githubPullSchema),
  },
} as const;
