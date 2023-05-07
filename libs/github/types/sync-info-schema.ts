import * as z from "zod"

export const syncInfoSchema = z.object({
  type: z.union([
    z.literal("action-run"),
    z.literal("action-workflow"),
    z.literal("commit"),
    z.literal("pull"),
    z.literal("pull-commit"),
    z.literal("release"),
    z.literal("stats-code-frequency"),
    z.literal("stats-commit-activity"),
    z.literal("stats-contributors"),
    z.literal("stats-participation"),
    z.literal("stats-punch-card"),
  ]),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
})
export type SyncInfo = z.infer<typeof syncInfoSchema>
