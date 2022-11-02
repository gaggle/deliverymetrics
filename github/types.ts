import { Epoch } from "../types.ts";
import { z } from "../deps.ts";

export const githubPullSchema = z.object({
  url: z.string(),
  id: z.number(),
  node_id: z.string(),
  html_url: z.string(),
  number: z.number(),
  state: z.union([z.literal("open"), z.literal("closed")]),
  locked: z.boolean(),
  title: z.string(),
  body: z.union([z.string(), z.null()]),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.union([z.string(), z.null()]),
  merged_at: z.union([z.string(), z.null()]),
  draft: z.boolean(),
  base: z.object({
    label: z.string(),
    ref: z.string(),
    sha: z.string(),
  }),
  _links: z.object({ html: z.object({ href: z.string(), }), self: z.object({ href: z.string(), }), }),
});
export type GithubPull = z.infer<typeof githubPullSchema>
export type GithubPullDateKey = keyof Pick<GithubPull, "created_at" | "updated_at" | "closed_at" | "merged_at">

export interface GithubDiff {
  syncedAt: Epoch;
  newPulls: Array<GithubPull>;
  updatedPulls: Array<{ prev: GithubPull | undefined, updated: GithubPull }>;
}

/**
 * https://docs.github.com/en/rest/pulls/pulls
 */
export const githubRestReposPullsSchema = z.array(githubPullSchema);
export type GithubRestReposPulls = z.infer<typeof githubRestReposPullsSchema>

export const githubRestSpec = {
  pulls: {
    getUrl: (owner: string, repo: string) => new URL(`https://api.github.com/repos/${owner}/${repo}/pulls`),
    schema: z.array(githubPullSchema)
  }
};

export interface GithubCache {
  readonly location: string;

  getUpdatedAt(): Promise<Epoch | undefined>;

  putUpdatedAt(time: Epoch): Promise<void>;

  getPulls(): AsyncGenerator<GithubPull>;

  putPulls(pulls: Array<GithubPull>, opts?: { syncTime?: Epoch }): Promise<void>;

  putPull(pull: GithubPull, opts?: { syncTime?: Epoch }): Promise<void>;
}

export const githubDiskCacheInfoSchema = z.object({
  updatedAt: z.union([z.number(), z.undefined()])
});
export type GithubDiskCacheInfo = z.infer<typeof githubDiskCacheInfoSchema>
