import { z } from "zod"

import { GithubPull } from "../pulls/mod.ts"

import { githubPullCommitSchema } from "./github-pull-commit-schema.ts"

export const githubPullCommitRestApiSpec = {
  getUrl: (pull: Pick<GithubPull, "commits_url">) => pull.commits_url,
  schema: z.array(githubPullCommitSchema),
}
