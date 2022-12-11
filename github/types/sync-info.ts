import * as z from "zod";

export const syncInfoSchema = z.object({
  createdAt: z.number(),
  updatedAt: z.number().optional(),
});
export type SyncInfo = z.infer<typeof syncInfoSchema>;
