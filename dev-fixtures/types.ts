import * as z from "zod"

export const fixtureSpecSchema = z.object({
  url: z.string(),
  name: z.string().optional(),
  method: z.enum(["GET", "POST"]).optional(),
  body: z.object({}).catchall(z.string()).optional(),
  json: z.boolean().optional(),
})
export type FixtureSpec = z.infer<typeof fixtureSpecSchema>

export const fixtureSpecsSchema = z.union([
  z.string(),
  fixtureSpecSchema,
]).array()
export type FixtureSpecs = z.infer<typeof fixtureSpecsSchema>
