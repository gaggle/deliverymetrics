import { z } from "zod"

import {
  githubActionRunHeaders,
  githubActionWorkflowHeaders,
  githubPullCommitHeaders,
  githubPullHeaders,
} from "../csv/mod.ts"

const positiveNumberOrInfinitySchema = z
  .union([z.number().positive(), z.literal("Infinity")])
  .default(90)
  .optional()

const jiraSyncSchema = z.object({
  project_key: z.string(),
  host: z.string().url(),
  api_user: z.string(),
  api_token: z.string(),
  sync_subtasks: z.boolean().optional(),
  max_days: positiveNumberOrInfinitySchema,
}).strict()

export type JiraSync = z.infer<typeof jiraSyncSchema>

const githubSyncSchema = z.object({
  repo: z.string().regex(/.*\/.*/),
  token: z.string().startsWith("ghp").optional(),
  max_days: positiveNumberOrInfinitySchema,
}).strict()

export type GithubSync = z.infer<typeof githubSyncSchema>

/**
 * Create Zod schema specifying `ignore_headers` and `header_order` fields (matched to the given headers)
 */
function headerOptions<T extends ReadonlyArray<string>>(headers: T): ReturnType<typeof z.object> {
  return z.object({
    header_order: z.custom<Array<T | string>>((v) => {
      if (!Array.isArray(v)) return false
      return v
        .every((el: string) => headers.includes(el) || el.match(/^\/.*\/$/))
    }, { message: `Elements must either be regex-like strings ("/.../") or one of: ${headers.join(", ")}` }).optional(),
    ignore_headers: z.custom<Array<T | string>>((v) => {
      if (!Array.isArray(v)) return false
      return v
        .every((el: string) => headers.includes(el) || el.match(/^\/.*\/$/))
    }, { message: `Elements must either be regex-like strings ("/.../") or one of: ${headers.join(", ")}` }).optional(),
  })
}

const configReportSchema = z.object({
  github: z.object({
    actionRuns: headerOptions(githubActionRunHeaders).extend({
      branch: z.string().optional(),
      workflow: z.string().optional(),
    }).optional(),
    actionWorkflows: headerOptions(githubActionWorkflowHeaders).optional(),
    pullCommits: headerOptions(githubPullCommitHeaders).optional(),
    pulls: headerOptions(githubPullHeaders).extend({
      ignore_labels: z.array(z.union([z.string(), z.custom<RegExp>((v) => v instanceof RegExp)])).optional(),
      include_cancelled: z.boolean().optional(),
    }).optional(),
  }).optional(),
  jira: z.object({
    completed_date_header: z.string().optional(),
    start_date_header: z.string().optional(),
    dev_lead_time_statuses: z.array(z.string()).optional(),
    dev_lead_time_types: z.array(z.string()).optional(),
    header_order: z.array(z.string()).optional(),
    ignore_headers: z.array(z.string()).optional(),
  })
    .optional(),
  outdir: z.string(),
  type: z.literal("csv"),
}).strict()

export type ConfigReport = z.infer<typeof configReportSchema>

export const configSchema = z.object({
  sync: z.object({
    github: githubSyncSchema.optional(),
    jira: jiraSyncSchema.optional(),
  }),
  report: configReportSchema.optional(),
})

export type Config = z.infer<typeof configSchema>
