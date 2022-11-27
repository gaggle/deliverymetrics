import { getEnv } from "../utils.ts";
import { path, yaml } from "../deps.ts";

import { fetchGithubFixtures, fetchJiraFixtures } from "./get-fixtures.ts";
import { FetchSpec, fetchSpecSchema } from "./types.ts";

const moduleDir = path.dirname(path.fromFileUrl(import.meta.url));
type FetchFunction = (args: FetchSpec) => Promise<void>;

const fixtureConfig: Array<
  { callable: FetchFunction; fetchSpecFilepath: string }
> = [
  {
    callable: fetchJiraFixtures,
    fetchSpecFilepath: path.join(moduleDir, "jira.yml"),
  },
  {
    callable: (commands) =>
      fetchGithubFixtures(commands, { token: getEnv("GITHUB_TOKEN") }),
    fetchSpecFilepath: path.join(moduleDir, "github.yml"),
  },
];

console.time();

const results = await Promise.allSettled(
  fixtureConfig.map(async ({ callable, fetchSpecFilepath }) => {
    const fetchSpec = fetchSpecSchema.parse(
      yaml.parse(await Deno.readTextFile(fetchSpecFilepath)),
    );
    await callable(fetchSpec);
  }),
);

for (const [idx, result] of results.entries()) {
  if (result.status === "rejected") {
    console.log(
      `ERROR: ${fixtureConfig[idx].fetchSpecFilepath} ${result.reason}`,
    );
  } else {
    console.log(`OK: ${fixtureConfig[idx].fetchSpecFilepath}`);
  }
}
console.timeLog();
