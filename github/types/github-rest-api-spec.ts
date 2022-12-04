import * as z from "zod";

import { githubPullSchema } from "./github-pull.ts";

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
  }
} as const;
