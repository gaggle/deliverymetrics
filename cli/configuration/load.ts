import { safeReadFileSync } from "../../libs/utils/mod.ts"

import { Config, configSchema } from "./types.ts"

export function loadConfiguration(fp?: string, defaultPaths?: Array<string>): Config & { fp: string } {
  const attempts: string[] = []
  let data: ReturnType<typeof safeReadFileSync>
  if (fp) {
    attempts.push(fp)
    data = safeReadFileSync(fp)
  } else {
    for (fp of defaultPaths || []) {
      if (!data) {
        attempts.push(fp)
        data = safeReadFileSync(fp)
      }
    }
  }
  if (!data || !fp) {
    throw new Deno.errors.NotFound(`No configuration file could be loaded, tried: ${attempts.join(", ")}`)
  }
  const decoder = new TextDecoder("utf-8")
  return { ...configSchema.parse(JSON.parse(decoder.decode(data))), fp }
}
