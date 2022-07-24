import { GithubDiskCache, GithubPull, githubPullSchema, ReadonlyGithubClient } from "../github/mod.ts";

import { csv, path } from "../deps.ts";
import { limit, ToTuple } from "../utils.ts";
import { withFileOpen } from "../path-and-file-utils.ts";

import { formatGithubClientStatus } from "./formatting.ts";

const primaryHeaders = ["number", "created_at", "merged_or_closed_at", "updated_at"] as const;
type PrimaryHeaders = typeof primaryHeaders;

const remainingHeaders = Object.keys(githubPullSchema.shape).filter(n => !(primaryHeaders.slice() as string[]).includes(n)) as unknown as RemainingHeaders;
type RemainingHeaders = Readonly<ToTuple<keyof Omit<GithubPull, PrimaryHeaders[number]>>>

const headers = [...primaryHeaders, ...remainingHeaders] as const;
type Row = Record<typeof headers[number], string>

export async function outputToCsv(
  { github, output, root, }: { github: { owner: string, repo: string, }, output: string, root: string }) {
  const gh = new ReadonlyGithubClient({
    cache: await GithubDiskCache.init(path.join(root, "data", "github", github.owner, github.repo)),
    owner: github.owner,
    repo: github.repo
  });
  console.log(await formatGithubClientStatus(gh, { mostRecent: false, unclosed: false }));

  await withFileOpen(async (f) => {
    await csv.writeCSVObjects(f, githubPullsAsCsv(limit(gh.findPulls(), 60)), { header: headers.slice() });
  }, output, { write: true, create: true, truncate: true });
}

async function * githubPullsAsCsv(pulls: AsyncGenerator<GithubPull>): AsyncGenerator<Row> {
  for await(const pull of pulls) {
    yield {
      _links: JSON.stringify(pull._links),
      base: JSON.stringify(pull.base),
      body: pull.body ? JSON.stringify(pull.body) : "",
      closed_at: pull.closed_at || "",
      created_at: pull.created_at,
      draft: pull.draft.toString(),
      html_url: pull.html_url,
      id: pull.id.toString(),
      locked: pull.locked.toString(),
      merged_at: pull.merged_at || "",
      merged_or_closed_at: pull.merged_at || pull.closed_at || "",
      node_id: pull.node_id,
      number: pull.number.toString(),
      state: pull.state,
      title: JSON.stringify(pull.title),
      updated_at: pull.updated_at,
      url: pull.url,
    };
  }
}
