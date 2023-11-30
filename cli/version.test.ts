import { assertMatch } from "dev:asserts"

import { version } from "./version.ts"

Deno.test("version extracts the version from .pkgx.yaml", async () => {
  const actualVersion = await version()
  const semVerRx = /^\d+\.\d+\.\d+$/
  assertMatch(actualVersion, semVerRx)
})
