//NOTE we statically replace this file at deployment
import * as path from "std:path"
import { parse as yamlParse } from "std:yaml"
import { z } from "zod"

const dirname = path.dirname(new URL(import.meta.url).pathname)

const PkgxSchema = z.object({
  env: z.object({
    VERSION: z.string(),
  }),
})
async function extractPkgxVersion() {
  const pkgxPath = path.join(dirname, "..", ".pkgx.yaml")
  const content = await Deno.readTextFile(pkgxPath)
  const pkgx = PkgxSchema.parse(yamlParse(content))
  return pkgx.env.VERSION
}

export async function version() {
  return await extractPkgxVersion() || "0.0.0+dev"
}
