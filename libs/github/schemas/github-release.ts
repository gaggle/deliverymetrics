import { z } from "zod"

export const githubReleaseSchema = z
  .object({
    url: z.string().url(),
    html_url: z.string().url(),
    assets_url: z.string().url(),
    upload_url: z.string(),
    tarball_url: z.union([z.string().url(), z.null()]),
    zipball_url: z.union([z.string().url(), z.null()]),
    id: z.number().int(),
    node_id: z.string(),
    tag_name: z.string().describe("The name of the tag."),
    target_commitish: z
      .string()
      .describe(
        "Specifies the commitish value that determines where the Git tag is created from.",
      ),
    name: z.union([z.string(), z.null()]),
    body: z.union([z.string(), z.null()]).optional(),
    draft: z
      .boolean()
      .describe(
        "true to create a draft (unpublished) release, false to create a published one.",
      ),
    prerelease: z
      .boolean()
      .describe(
        "Whether to identify the release as a prerelease or a full release.",
      ),
    created_at: z.string(),
    published_at: z.union([z.string(), z.null()]),
    author: z
      .object({
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
    assets: z.array(
      z
        .object({
          url: z.string().url(),
          browser_download_url: z.string().url(),
          id: z.number().int(),
          node_id: z.string(),
          name: z.string().describe("The file name of the asset."),
          label: z.union([z.string(), z.null()]),
          state: z
            .enum(["uploaded", "open"])
            .describe("State of the release asset."),
          content_type: z.string(),
          size: z.number().int(),
          download_count: z.number().int(),
          created_at: z.string(),
          updated_at: z.string(),
          uploader: z.union([
            z.null(),
            z
              .object({
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
          ]),
        })
        .describe("Data related to a release."),
    ),
    body_html: z.string().optional(),
    body_text: z.string().optional(),
    mentions_count: z
      .number()
      .int()
      .optional(),
    discussion_url: z
      .string()
      .url()
      .describe("The URL of the release discussion.")
      .optional(),
    reactions: z
      .object({
        url: z.string().url(),
        total_count: z.number().int(),
        "+1": z.number().int(),
        "-1": z.number().int(),
        laugh: z.number().int(),
        confused: z.number().int(),
        heart: z.number().int(),
        hooray: z.number().int(),
        eyes: z.number().int(),
        rocket: z.number().int(),
      })
      .optional(),
  })

export type GithubRelease = z.infer<typeof githubReleaseSchema>
