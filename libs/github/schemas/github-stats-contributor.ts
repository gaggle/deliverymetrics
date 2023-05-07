import { z } from "zod"

export const githubStatsContributorSchema = z
  .object({
    author: z.union([
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
    total: z.number().int(),
    weeks: z.array(
      z.object({
        w: z
          .number()
          .int()
          .optional(),
        a: z
          .number()
          .int()
          .optional(),
        d: z
          .number()
          .int()
          .optional(),
        c: z
          .number()
          .int()
          .optional(),
      }),
    ),
  })
  .describe("Contributor Activity")

export type GithubStatsContributor = z.infer<typeof githubStatsContributorSchema>
