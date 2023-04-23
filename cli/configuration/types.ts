import * as z from "zod"

import { GithubPullHeaders, githubPullHeaders } from "../csv/csv-github-pull-headers.ts"
import { GithubPullCommitHeaders, githubPullCommitHeaders } from "../csv/csv-github-pull-commit-headers.ts"
import { GithubActionWorkflowHeaders, githubActionWorkflowHeaders } from "../csv/csv-github-action-workflows-headers.ts"
import { GithubActionRunHeaders, githubActionRunHeaders } from "../csv/csv-github-action-run-headers.ts"

const positiveNumberOrInfinitySchema = z
  .union([z.number().positive(), z.literal("Infinity")])
  .default(90)
  .optional()

const jiraSyncSchema = z.object({
  name: z.string().min(1),
  project: z.string(),
  query_type: z.string(),
  max_days: positiveNumberOrInfinitySchema,
  api_token: z.string(),
  api_user: z.string(),
}).strict()

export type JiraSync = z.infer<typeof jiraSyncSchema>

const githubSyncSchema = z.object({
  name: z.string().min(1),
  repo: z.string().regex(/.*\/.*/),
  token: z.string().startsWith("ghp").optional(),
  max_days: positiveNumberOrInfinitySchema,
}).strict()

export type GithubSync = z.infer<typeof githubSyncSchema>

const configReportSchema = z.object({
  type: z.literal("csv"),
  outdir: z.string(),
  github: z.object({
    actionRuns: z.object({
      ignore_headers: z.custom<Array<GithubActionRunHeaders[number]>>((v) => {
        if (!Array.isArray(v)) return false
        return v.every((el) => githubActionRunHeaders.includes(el))
      }, { message: `Must be array with elements of: ${githubActionRunHeaders.join(", ")}` }).optional(),
      header_order: z.custom<Array<GithubActionRunHeaders[number]>>((v) => {
        if (!Array.isArray(v)) return false
        return v.every((el) => githubActionRunHeaders.includes(el))
      }, { message: `Must be array with elements of: ${githubActionRunHeaders.join(", ")}` }).optional(),
      branch: z.string().optional(),
    }).optional(),
    actionWorkflows: z.object({
      ignore_headers: z.custom<Array<GithubActionWorkflowHeaders[number]>>((v) => {
        if (!Array.isArray(v)) return false
        return v.every((el) => githubActionWorkflowHeaders.includes(el))
      }, { message: `Must be array with elements of: ${githubActionWorkflowHeaders.join(", ")}` }).optional(),
      header_order: z.custom<Array<GithubActionWorkflowHeaders[number]>>((v) => {
        if (!Array.isArray(v)) return false
        return v.every((el) => githubActionWorkflowHeaders.includes(el))
      }, { message: `Must be array with elements of: ${githubActionWorkflowHeaders.join(", ")}` }).optional(),
    }).optional(),
    pullCommits: z.object({
      ignore_headers: z.custom<Array<GithubPullCommitHeaders[number]>>((v) => {
        if (!Array.isArray(v)) return false
        return v.every((el) => githubPullCommitHeaders.includes(el))
      }, { message: `Must be array with elements of: ${githubPullCommitHeaders.join(", ")}` }).optional(),
      header_order: z.custom<Array<GithubPullCommitHeaders[number]>>((v) => {
        if (!Array.isArray(v)) return false
        return v.every((el) => githubPullCommitHeaders.includes(el))
      }, { message: `Must be array with elements of: ${githubPullCommitHeaders.join(", ")}` }).optional(),
    }).optional(),
    pulls: z.object({
      ignore_headers: z.custom<Array<GithubPullHeaders[number]>>((v) => {
        if (!Array.isArray(v)) return false
        return v.every((el) => githubPullHeaders.includes(el))
      }, { message: `Must be array with elements of: ${githubPullHeaders.join(", ")}` }).optional(),
      header_order: z.custom<Array<GithubPullHeaders[number]>>((v) => {
        if (!Array.isArray(v)) return false
        return v.every((el) => githubPullHeaders.includes(el))
      }, { message: `Must be array with elements of: ${githubPullHeaders.join(", ")}` }).optional(),
      include_cancelled: z.boolean().optional(),
      ignore_labels: z.array(z.union([
        z.string(),
        z.custom<RegExp>((v) => v instanceof RegExp),
      ])).optional(),
    }).optional(),
  }).optional(),
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
