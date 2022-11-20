import { z } from "../deps.ts";

export const fetchSpecSchema = z.union([
  z.string(),
  z.object({
    url: z.string(),
    name: z.string().optional(),
    method: z.enum(["GET", "POST"]).optional(),
    body: z.object({}).catchall(z.string()).optional(),
  })
]).array();
export type FetchSpec = z.infer<typeof fetchSpecSchema>

