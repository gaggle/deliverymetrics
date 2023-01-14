import * as z from "zod";

const githubUser = z.union([
  z.null(),
  z.object({
    name: z.union([z.string(), z.null()]).optional(),
    email: z.union([z.string(), z.null()]).optional(),
    login: z.string(),
    id: z.number().int(),
    node_id: z.string(),
    avatar_url: z.string().url(),
    gravatar_id: z.union([z.string(), z.null()]),
    url: z.string().url(),
    html_url: z.string().url(),
    followers_url: z.string().url(),
    following_url: z.string(),
    gists_url: z.string(),
    starred_url: z.string(),
    subscriptions_url: z.string().url(),
    organizations_url: z.string().url(),
    repos_url: z.string().url(),
    events_url: z.string(),
    received_events_url: z.string().url(),
    type: z.string(),
    site_admin: z.boolean(),
    starred_at: z.string().optional(),
  })
    .describe("A GitHub user."),
]);

const diffEntry = z.object({
  sha: z.string(),
  filename: z.string(),
  status: z.enum([
    "added",
    "removed",
    "modified",
    "renamed",
    "copied",
    "changed",
    "unchanged",
  ]),
  additions: z.number().int(),
  deletions: z.number().int(),
  changes: z.number().int(),
  blob_url: z.string().url(),
  raw_url: z.string().url(),
  contents_url: z.string().url(),
  patch: z.string().optional(),
  previous_filename: z.string().optional(),
})
  .describe("Diff Entry");

const metapropertiesForGitAuthorCommitterInformation = z.union([
  z.null(),
  z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    date: z.string().optional(),
  })
    .describe("Metaproperties for Git author/committer information."),
]);

export const githubPullCommitSchema = z.object({
  url: z.string().url(),
  sha: z.string(),
  node_id: z.string(),
  html_url: z.string().url(),
  comments_url: z.string().url(),
  commit: z.object({
    url: z.string().url(),
    author: metapropertiesForGitAuthorCommitterInformation,
    committer: metapropertiesForGitAuthorCommitterInformation,
    message: z.string(),
    comment_count: z.number().int(),
    tree: z.object({ sha: z.string(), url: z.string().url() }),
    verification: z.object({
      verified: z.boolean(),
      reason: z.string(),
      payload: z.union([z.string(), z.null()]),
      signature: z.union([z.string(), z.null()]),
    })
      .optional(),
  }),
  author: githubUser,
  committer: githubUser,
  parents: z.array(
    z.object({
      sha: z.string(),
      url: z.string().url(),
      html_url: z.string().url().optional(),
    }),
  ),
  stats: z.object({
    additions: z.number().int().optional(),
    deletions: z.number().int().optional(),
    total: z.number().int().optional(),
  })
    .optional(),
  files: z.array(diffEntry).optional(),
})
  .describe("Commit");

export type GithubPullCommit = z.infer<typeof githubPullCommitSchema>;

/**
 * "Bound" meaning bound to a pull, i.e. it has a `pr` field
 */
export const boundGithubPullCommit = githubPullCommitSchema.extend({ pr: z.number() });

/**
 * "Bound" meaning bound to a pull, i.e. it has a `pr` field
 */
export type BoundGithubPullCommit = z.infer<typeof boundGithubPullCommit>;

export type GithubPullCommitDateKey = "commit.author" | "commit.committer";
