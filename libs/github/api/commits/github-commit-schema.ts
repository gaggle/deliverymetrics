import { z } from "zod"

export const githubCommitSchema = z
  .object({
    url: z.string().url(),
    sha: z.string(),
    node_id: z.string(),
    html_url: z.string().url(),
    comments_url: z.string().url(),
    commit: z.object({
      url: z.string().url(),
      author: z.union([
        z.null(),
        z
          .object({
            name: z.string().optional(),
            email: z.string().optional(),
            date: z.string().optional(),
          })
          .describe("Metaproperties for Git author/committer information."),
      ]),
      committer: z.union([
        z.null(),
        z
          .object({
            name: z.string().optional(),
            email: z.string().optional(),
            date: z.string().optional(),
          })
          .describe("Metaproperties for Git author/committer information."),
      ]),
      message: z.string(),
      comment_count: z.number().int(),
      tree: z.object({ sha: z.string(), url: z.string().url() }),
      verification: z
        .object({
          verified: z.boolean(),
          reason: z.string(),
          payload: z.union([z.string(), z.null()]),
          signature: z.union([z.string(), z.null()]),
        })
        .optional(),
    }),
    author: z.union([
      z.null(),
      z.object({
        name: z.union([z.string(), z.null()]).optional(),
        email: z.union([z.string(), z.null()]).optional(),
        login: z.string().optional(),
        id: z.number().int().optional(),
        node_id: z.string().optional(),
        avatar_url: z.string().url().optional(),
        gravatar_id: z.union([z.string(), z.null()]).optional(),
        url: z.string().url().optional(),
        html_url: z.string().url().optional(),
        followers_url: z.string().url().optional(),
        following_url: z.string().optional(),
        gists_url: z.string().optional(),
        starred_url: z.string().optional(),
        subscriptions_url: z.string().url().optional(),
        organizations_url: z.string().url().optional(),
        repos_url: z.string().url().optional(),
        events_url: z.string().optional(),
        received_events_url: z.string().url().optional(),
        type: z.string().optional(),
        site_admin: z.boolean().optional(),
        starred_at: z.string().optional(),
      })
        .describe("A GitHub user."),
    ]),
    committer: z.union([
      z.null(),
      z.object({
        name: z.union([z.string(), z.null()]).optional(),
        email: z.union([z.string(), z.null()]).optional(),
        login: z.string().optional(),
        id: z.number().int().optional(),
        node_id: z.string().optional(),
        avatar_url: z.string().url().optional(),
        gravatar_id: z.union([z.string(), z.null()]).optional(),
        url: z.string().url().optional(),
        html_url: z.string().url().optional(),
        followers_url: z.string().url().optional(),
        following_url: z.string().optional(),
        gists_url: z.string().optional(),
        starred_url: z.string().optional(),
        subscriptions_url: z.string().url().optional(),
        organizations_url: z.string().url().optional(),
        repos_url: z.string().url().optional(),
        events_url: z.string().optional(),
        received_events_url: z.string().url().optional(),
        type: z.string().optional(),
        site_admin: z.boolean().optional(),
        starred_at: z.string().optional(),
      })
        .describe("A GitHub user."),
    ]),
    parents: z.array(
      z.object({
        sha: z.string(),
        url: z.string().url(),
        html_url: z.string().url().optional(),
      }),
    ),
    stats: z
      .object({
        additions: z.number().int().optional(),
        deletions: z.number().int().optional(),
        total: z.number().int().optional(),
      })
      .optional(),
    files: z
      .array(
        z
          .object({
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
          .describe("Diff Entry"),
      )
      .optional(),
  })

export type GithubCommit = z.infer<typeof githubCommitSchema>
