import { z } from "zod";

export const actionWorkflowSchema = z.object({
  id: z.number().int(),
  node_id: z.string(),
  name: z.string(),
  path: z.string(),
  state: z.enum([
    "active",
    "deleted",
    "disabled_fork",
    "disabled_inactivity",
    "disabled_manually",
  ]),
  created_at: z.string(),
  updated_at: z.string(),
  url: z.string(),
  html_url: z.string(),
  badge_url: z.string(),
  deleted_at: z.string().optional(),
})
  .describe("A GitHub Actions workflow");

export type ActionWorkflow = z.infer<typeof actionWorkflowSchema>;
