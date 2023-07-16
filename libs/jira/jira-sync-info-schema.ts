import { z } from "zod"

const jiraSyncInfoZodTypes = [z.literal("search")] as const

export const jiraSyncInfoTypes = jiraSyncInfoZodTypes.map((el) => el.value)

export const jiraSyncInfoSchema = z.object({
  type: z.literal("search"),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
})

export type JiraSyncInfo = z.infer<typeof jiraSyncInfoSchema>
