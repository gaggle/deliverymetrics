import { dirname, fromFileUrl, join } from "std:path"
import { parse as yamlParse } from "std:yaml-encoding"

import { getEnv } from "../libs/utils/mod.ts"

import { fetchGithubFixtures, fetchJiraFixtures } from "./get-fixtures.ts"
import { FixtureSpecs, fixtureSpecsSchema } from "./types.ts"

export type FetchFunction = (fixtureSpec: FixtureSpecs) => Promise<void>
const moduleDir = dirname(fromFileUrl(import.meta.url))
const outputDir = join(moduleDir, "..", ".fixtures")

const fixtureConfig: Array<{ callable: FetchFunction; definitionFilepath: string }> = [
  {
    callable: (specs) =>
      fetchJiraFixtures(specs, join(outputDir, "jira"), {
        token: getEnv("JIRA_API_TOKEN"),
        user: getEnv("JIRA_API_USER"),
      }),
    definitionFilepath: join(outputDir, "jira.yml"),
  },
  {
    callable: (specs) => fetchGithubFixtures(specs, join(outputDir, "github"), { token: getEnv("GITHUB_TOKEN") }),
    definitionFilepath: join(outputDir, "github.yml"),
  },
]

const results = await Promise.allSettled(
  fixtureConfig.map(async ({ callable, definitionFilepath }) => {
    let content: string
    try {
      content = await Deno.readTextFile(definitionFilepath)
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return
      } else {
        throw err
      }
    }
    const fetchSpec = fixtureSpecsSchema.parse(
      yamlParse(content),
    )
    await callable(fetchSpec)
  }),
)

for (const [idx, result] of results.entries()) {
  if (result.status === "rejected") {
    console.log(
      `ERROR: ${fixtureConfig[idx].definitionFilepath} ${result.reason}`,
    )
  } else {
    console.log(`OK: ${fixtureConfig[idx].definitionFilepath}`)
  }
}
