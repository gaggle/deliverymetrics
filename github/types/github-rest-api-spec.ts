import * as z from "zod";

import { GithubPull, githubPullSchema } from "./github-pull.ts";
import { githubPullCommitSchema } from "./github-pull-commit.ts";

export const githubRestSpec = {
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
  /**
   * https://docs.github.com/en/rest/pulls/pulls#list-commits-on-a-pull-request
   */
  pullCommits: {
    getUrl: (pull: Pick<GithubPull, "commits_url">) => pull.commits_url,
    schema: z.array(githubPullCommitSchema),
  },
} as const;
