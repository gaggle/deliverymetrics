import { GithubDiskCache, GithubPull, githubPullSchema, ReadonlyGithubClient } from "../github/mod.ts";

import { csv, fs, path } from "../deps.ts";
import { ToTuple } from "../utils.ts";
import { withFileOpen } from "../path-and-file-utils.ts";

import { formatGithubClientStatus } from "./formatting.ts";

const primaryHeaders = ["number", "created_at", "merged_at", "updated_at", "was_cancelled",] as const;
type PrimaryHeaders = typeof primaryHeaders;

const remainingHeaders = Object.keys(githubPullSchema.shape).filter(n => !(primaryHeaders.slice() as string[]).includes(n)) as unknown as RemainingHeaders;
type RemainingHeaders = Readonly<ToTuple<keyof Omit<GithubPull, PrimaryHeaders[number]>>>

const headers = [...primaryHeaders, ...remainingHeaders] as const;
export type Row = Record<typeof headers[number], string>

export async function outputToCsv(
  { github, outputDir, root, }: { github: { owner: string, repo: string, }, outputDir: string, root: string }) {
  const gh = new ReadonlyGithubClient({
    cache: await GithubDiskCache.init(path.join(root, "data", "github", github.owner, github.repo)),
    owner: github.owner,
    repo: github.repo
  });
  console.log(await formatGithubClientStatus(gh, { mostRecent: false, unclosed: false }));

  const pulls = gh.findPulls({ sort: { key: "created_at", order: "asc" } });

  const outputCsv = path.join(outputDir, "output.csv");
  await fs.ensureFile(outputCsv);
  await withFileOpen(async (f) => {
    await csv.writeCSVObjects(f, githubPullsAsCsv(pulls), { header: headers.slice() });
  }, outputCsv, { write: true, create: true, truncate: true });
}

async function * githubPullsAsCsv(pulls: AsyncIterableIterator<GithubPull>): AsyncIterableIterator<Row> {
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
      node_id: pull.node_id,
      number: pull.number.toString(),
      state: pull.state,
      title: JSON.stringify(pull.title),
      updated_at: pull.updated_at,
      url: pull.url,
      was_cancelled: Boolean(pull.closed_at && !pull.merged_at).toString(),
    };
  }
}
