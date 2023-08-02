//NOTE we statically replace this file at deployment
import * as path from "std:path"

import { extractSemVers, single } from "../libs/utils/mod.ts"

const dirname = path.dirname(new URL(import.meta.url).pathname)

async function extractReadmeVersion() {
  const readmePath = path.join(dirname, "..", "README.md")
  const content = await Deno.readTextFile(readmePath)
  for (const line of content.split("\n")) {
    if (line.includes("# gaggle/deliverymetrics")) {
      return single(extractSemVers(line)).raw
    }
  }
}

export async function version() {
  return await extractReadmeVersion() || "0.0.0+dev"
}
