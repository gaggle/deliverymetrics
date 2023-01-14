import { assertEquals } from "dev:asserts";
import { join } from "std:path";
import { readCSVObjects } from "csv";
import { stub } from "dev:mock";

import {
  createFakeReadonlyGithubClient,
  getFakeActionRun,
  getFakeActionWorkflow,
  getFakePull,
  getFakeSyncInfo,
} from "../github/testing.ts";

import { asyncToArray } from "../utils.ts";
import { withFileOpen, withTempDir, yieldDir } from "../path-and-file-utils.ts";
import { withStubs } from "../dev-utils.ts";

import { _internals, outputToCsv } from "./output-to-csv.ts";

/**
 * This sets up a test context and calls `outputToCsv`, passing back the output directory.
 *
 * Convenience function to slim down the tests.
 */
async function withOutputToCsv(
  t: Deno.TestContext,
  name: string,
  callable: (opts: { outputDir: string; t: Deno.TestContext }) => Promise<void>,
  { githubClientData, expectedFiles }: Partial<{
    githubClientData: Parameters<typeof createFakeReadonlyGithubClient>[0];
    expectedFiles: Array<string> | Readonly<Array<string>>;
  }>,
): Promise<void> {
  await t.step(name, async (t) => {
    await withTempDir(async (outputDir) => {
      await withStubs(
        async () => {
          await t.step("runs outputToCsv without error", async () => {
            await outputToCsv({
              github: { owner: "owner", repo: "repo" },
              outputDir,
              persistenceRoot: "persistenceRoot",
            });
          });

          if (expectedFiles) {
            await t.step("outputs the expected files", async () => {
              const actual = await asyncToArray(yieldDir(outputDir));
              const expected = Array.from(expectedFiles);
              assertEquals(actual.sort(), expected.sort());
            });
          }

          await callable({ outputDir, t });
        },
        stub(
          _internals,
          "getGithubClient",
          () => createFakeReadonlyGithubClient(githubClientData),
        ),
      );
    });
  });
}

const pullOutputNames = [
  "pull-request-data-90d.csv",
  "pull-request-lead-times-daily-90d.csv",
  "pull-request-lead-times-monthly-90d.csv",
  "pull-request-lead-times-weekly-90d.csv",
] as const;

type PullOutputName = typeof pullOutputNames[number];

function getPullOutputName(el: PullOutputName): PullOutputName {
  const idx = pullOutputNames.indexOf(el);
  return pullOutputNames[idx];
}

Deno.test({
  sanitizeOps: false,
  // ↑ `progress` registers an exit-handler which gets flagged by sanitization, I... think it's harmless though 😬
  name: "outputToCsv",
  fn: async (t) => {
    await withOutputToCsv(t, "with a simple pull", async ({ outputDir, t }) => {
      await t.step("formats all pull request data as expected", async () => {
        await withCsvContent((content) => {
          assertEquals(content.length, 1);

          assertEquals(content[0], {
            closed_at: "",
            commits_authors: "",
            commits_committers: "",
            commits_count: "0",
            created_at: "1981-01-01T00:00:00Z",
            draft: "false",
            head_ref: "fix/FOO-01",
            html_url: "https://url",
            labels: "",
            locked: "false",
            merge_commit_sha: "2fd4e1c67a2d28fced849ee1bb76e7391b93eb12",
            merged_at: "",
            number: "1",
            state: "open",
            title: '"title"',
            updated_at: "1981-01-01T00:00:00Z",
            "Lead Time (in days)": "",
            "Was Cancelled?": "false",
            "Time to Merge (in days)": "",
          });
        }, join(outputDir, getPullOutputName("pull-request-data-90d.csv")));
      });
    }, {
      githubClientData: {
        pulls: [
          getFakePull({ number: 1, created_at: "1981-01-01T00:00:00Z" }),
        ],
        syncInfos: [
          getFakeSyncInfo({
            createdAt: new Date("1981-01-01T00:00:00Z").getTime(),
            updatedAt: new Date("1981-01-01T00:00:00Z").getTime(),
          }),
        ],
      },
      expectedFiles: ["pull-request-data-90d.csv"],
    });

    await withOutputToCsv(t, "with a pull that's closed but not merged", async ({ outputDir, t }) => {
      await t.step('sets "Was Cancelled?" to true', async () => {
        // ↑ encoded to avoid outputting literal newlines that can confuse the csv format
        await withCsvContent((content) => {
          assertEquals(content.length, 1);
          assertEquals(content[0]["Was Cancelled?"], "true");
        }, join(outputDir, getPullOutputName("pull-request-data-90d.csv")));
      });
    }, {
      githubClientData: {
        pulls: [
          getFakePull({
            number: 1,
            created_at: "1983-01-01T00:00:00Z",
            closed_at: "1983-01-02T00:00:00Z",
            merged_at: null,
          }),
        ],
        syncInfos: [getFakeSyncInfo({
          createdAt: new Date("1983-01-01T00:00:00Z").getTime(),
          updatedAt: new Date("1983-01-01T00:00:00Z").getTime(),
        })],
      },
      expectedFiles: ["pull-request-data-90d.csv"],
    });

    await withOutputToCsv(t, "with two closed pulls", async ({ outputDir, t }) => {
      await t.step("formats daily pull-request lead times as expected", async () => {
        await withCsvContent((content) => {
          assertEquals(content.length, 1);

          assertEquals(content[0], {
            "Period Start": "1984-01-05T00:00:00.000Z",
            "Period End": "1984-01-05T23:59:59.999Z",
            "# of PRs Merged": "1",
            "Merged PRs": "4",
            "Lead Time (in days)": "5.0",
            "Time to Merge (in days)": "",
          });
        }, join(outputDir, getPullOutputName("pull-request-lead-times-daily-90d.csv")));
      });

      await t.step("formats weekly pull-request lead times as expected", async () => {
        await withCsvContent((content) => {
          assertEquals(content.length, 1);

          assertEquals(content[0], {
            "Period Start": "1984-01-02T00:00:00.000Z",
            "Period End": "1984-01-08T23:59:59.999Z",
            "# of PRs Merged": "1",
            "Merged PRs": "4",
            "Lead Time (in days)": "5.0",
            "Time to Merge (in days)": "",
          });
        }, join(outputDir, getPullOutputName("pull-request-lead-times-weekly-90d.csv")));
      });

      await t.step("formats monthly pull-request lead times as expected", async () => {
        await withCsvContent((content) => {
          assertEquals(content.length, 1);

          assertEquals(content[0], {
            "Period Start": "1984-01-01T00:00:00.000Z",
            "Period End": "1984-01-31T23:59:59.999Z",
            "# of PRs Merged": "1",
            "Merged PRs": "4",
            "Lead Time (in days)": "5.0",
            "Time to Merge (in days)": "",
          });
        }, join(outputDir, getPullOutputName("pull-request-lead-times-monthly-90d.csv")));
      });
    }, {
      githubClientData: {
        pulls: [
          getFakePull({ number: 4, created_at: "1984-01-01T00:00:00Z", merged_at: "1984-01-05T00:00:00Z" }),
        ],
        syncInfos: [
          getFakeSyncInfo({
            createdAt: new Date("1984-01-01T00:00:00Z").getTime(),
            updatedAt: new Date("1984-01-01T00:00:00Z").getTime(),
          }),
        ],
      },
      expectedFiles: pullOutputNames,
    });

    await withOutputToCsv(t, "with a simple action run", async ({ outputDir, t }) => {
      await t.step("formats workflow histogram as expected", async () => {
        await withCsvContent((content) => {
          assertEquals(content.length, 1);

          assertEquals(content[0], {
            "Period Start": "1984/01/03 00.00.00",
            "Period End": "1984/01/03 23.59.59",
            "Name": "Name",
            "Path": "path.yml",
            "Invocations": "1",
            "Conclusions": "success",
            "Run IDs": "1",
            "Run URLs": "https://example.com/1",
          });
        }, join(outputDir, "workflows/Name/histogram-daily.csv"));
      });
    }, {
      githubClientData: {
        workflows: [getFakeActionWorkflow({ path: "path.yml", name: "Name" })],
        actionsRuns: [getFakeActionRun({
          id: 1,
          created_at: "1984-01-03T00:00:00Z",
          updated_at: "1984-01-03T01:00:00Z",
          path: "path.yml",
          name: "Name",
          conclusion: "success",
          html_url: "https://example.com/1",
        })],
      },
      expectedFiles: [
        "workflows/Name/histogram-monthly.csv",
        "workflows/Name/histogram-daily.csv",
        "workflows/Name/histogram-weekly.csv",
      ],
    });
  },
});

async function withCsvContent(
  callback: (content: Array<{ [key: string]: string }>) => void,
  filepath: string,
) {
  await withFileOpen(async (f) => {
    const content = await asyncToArray(readCSVObjects(f));
    await callback(content);
  }, filepath);
}
