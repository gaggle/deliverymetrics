import { z } from "zod"

const syncInfoZodTypes = [
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
] as const

export const syncInfoTypes = syncInfoZodTypes.map((el) => el.value)

export const syncInfoSchema = z.object({
  type: z.union(syncInfoZodTypes),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
})

export type SyncInfo = z.infer<typeof syncInfoSchema>
