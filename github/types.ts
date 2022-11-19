import { Epoch } from "../types.ts";
import { z } from "../deps.ts";

const githubPullRepoSchema = z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    private: z.boolean(),
    html_url: z.string(),
    description: z.string(),
    fork: z.boolean(),
    url: z.string(),
    forks_url: z.string(),
    keys_url: z.string(),
    collaborators_url: z.string(),
    teams_url: z.string(),
    hooks_url: z.string(),
    issue_events_url: z.string(),
    events_url: z.string(),
    assignees_url: z.string(),
    branches_url: z.string(),
    tags_url: z.string(),
    blobs_url: z.string(),
    git_tags_url: z.string(),
    git_refs_url: z.string(),
    trees_url: z.string(),
    statuses_url: z.string(),
    languages_url: z.string(),
    stargazers_url: z.string(),
    contributors_url: z.string(),
    subscribers_url: z.string(),
    subscription_url: z.string(),
    commits_url: z.string(),
    git_commits_url: z.string(),
    comments_url: z.string(),
    issue_comment_url: z.string(),
    contents_url: z.string(),
    compare_url: z.string(),
    merges_url: z.string(),
    archive_url: z.string(),
    downloads_url: z.string(),
    issues_url: z.string(),
    pulls_url: z.string(),
    milestones_url: z.string(),
    notifications_url: z.string(),
    labels_url: z.string(),
    releases_url: z.string(),
    deployments_url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    pushed_at: z.string(),
    git_url: z.string(),
    ssh_url: z.string(),
    clone_url: z.string(),
    svn_url: z.string(),
    homepage: z.string(),
    size: z.number(),
    stargazers_count: z.number(),
    watchers_count: z.number(),
    language: z.string(),
    has_issues: z.boolean(),
    has_projects: z.boolean(),
    has_downloads: z.boolean(),
    has_wiki: z.boolean(),
    has_pages: z.boolean(),
    has_discussions: z.boolean().optional(),
    forks_count: z.number(),
    mirror_url: z.union([z.string(), z.null()]),
    archived: z.boolean(),
    disabled: z.boolean(),
    open_issues_count: z.number(),
    license: z.null(),
    allow_forking: z.boolean(),
    is_template: z.boolean(),
    web_commit_signoff_required: z.boolean(),
    topics: z.array(z.string()),
    visibility: z.literal("internal"),
    forks: z.number(),
    open_issues: z.number(),
    watchers: z.number(),
    default_branch: z.string()
  }
);
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
  merge_commit_sha: z.string(),
  labels: z.array(z.object({
    id: z.number(),
    node_id: z.string(),
    url: z.string(),
    name: z.string(),
    color: z.string(),
    default: z.boolean(),
    description: z.string(),
  })),
  commits_url: z.string(),
  review_comments_url: z.string(),
  review_comment_url: z.string(),
  comments_url: z.string(),
  statuses_url: z.string(),
  draft: z.boolean(),
  head: z.object({
    label: z.string(),
    ref: z.string(),
    sha: z.string(),
    user: z.object({
      login: z.string(),
      id: z.number(),
      node_id: z.string(),
      avatar_url: z.string(),
      gravatar_id: z.string(),
      url: z.string(),
      html_url: z.string(),
      followers_url: z.string(),
      following_url: z.string(),
      gists_url: z.string(),
      starred_url: z.string(),
      subscriptions_url: z.string(),
      organizations_url: z.string(),
      repos_url: z.string(),
      events_url: z.string(),
      received_events_url: z.string(),
      type: z.string(),
      site_admin: z.boolean(),
    }),
    repo: githubPullRepoSchema,
  }),
  base: z.object({
    label: z.string(),
    ref: z.string(),
    sha: z.string(),
    repo: githubPullRepoSchema,
  }),
  _links: z.object({
    html: z.object({ href: z.string(), }),
    self: z.object({ href: z.string(), }),
    commits: z.object({ href: z.string(), }),
    statuses: z.object({ href: z.string(), }),
  }),
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

export interface ReadonlyGithubClient {
  cacheInfo: Readonly<{ getUpdatedAt: () => Promise<Epoch | undefined>, location: string }>;
  htmlUrl: string;

  findPulls(opts?: Sortable): AsyncGenerator<GithubPull>;

  findUnclosedPulls(): AsyncGenerator<GithubPull>;

  findLatestPull(): Promise<GithubPull | undefined>;
}

export interface GithubClient extends ReadonlyGithubClient {
  sync(): Promise<GithubDiff>;
}

export type Sortable = Partial<{ sort: { key: GithubPullDateKey; order?: "asc" | "desc" } }>;
