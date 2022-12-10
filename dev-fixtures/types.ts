import * as z from "zod";

export const fetchSpecCommand = z.object({
  url: z.string(),
  name: z.string().optional(),
  method: z.enum(["GET", "POST"]).optional(),
  body: z.object({}).catchall(z.string()).optional(),
  json: z.boolean().optional(),
});
export type FetchSpecCommand = z.infer<typeof fetchSpecCommand>;

export const fetchSpecSchema = z.union([
  z.string(),
  fetchSpecCommand,
]).array();
export type FetchSpec = z.infer<typeof fetchSpecSchema>;
