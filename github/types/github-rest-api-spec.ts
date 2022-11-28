import * as z from "zod";

import { githubPullSchema } from "./github-pull.ts";

export const githubRestSpec = {
  /**
   * https://docs.github.com/en/rest/pulls/pulls
   */
  pulls: {
    getUrl: (owner: string, repo: string) => new URL(`https://api.github.com/repos/${owner}/${repo}/pulls`),
    schema: z.array(githubPullSchema),
  },
} as const;
