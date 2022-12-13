import { assertEquals } from "dev:asserts";
import { join } from "path";
import { readCSVObjects } from "csv";
import { stub } from "dev:mock";

import {
  createFakeReadonlyGithubClient,
  getFakeActionRun,
  getFakeActionWorkflow,
  getFakePull,
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
          await outputToCsv({
            github: { owner: "owner", repo: "repo" },
            outputDir,
            persistenceRoot: "persistenceRoot",
          });

          if (expectedFiles) {
            await t.step("outputs the expected files", async () => {
              assertEquals(await asyncToArray(yieldDir(outputDir)), Array.from(expectedFiles));
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
  "pull-request-lead-times-weekly.csv",
  "pull-request-lead-times-monthly.csv",
  "all-pull-request-data.csv",
  "pull-request-lead-times-daily.csv",
] as const;

type PullOutputName = typeof pullOutputNames[number];

function getPullOutputName(el: PullOutputName): PullOutputName {
  const idx = pullOutputNames.indexOf(el);
  return pullOutputNames[idx];
}

Deno.test("outputToCsv", async (t) => {
  await withOutputToCsv(t, "with a simple pull", async ({ outputDir, t }) => {
    await t.step("formats all pull request data as expected", async () => {
      await withCsvContent((content) => {
        assertEquals(content.length, 1);

        assertEquals(content[0], {
          _links: JSON.stringify({
            html: { href: "https://url" },
            self: { href: "https://url" },
            commits: { href: `https://api.github.com/repos/owner/repo/pulls/1/commits` },
            statuses: {
              href: "https://api.github.com/repos/owner/repo/statuses/da39a3ee5e6b4b0d3255bfef95601890afd80709",
            },
          }),
          base: JSON.stringify({
            label: "Foo:main",
            ref: "main",
            sha: "ab1c2d3ef45g6h7ijkl8m90n1op23q4r567st8u9",
          }),
          body: "",
          closed_at: "",
          created_at: "1981-01-01T00:00:00Z",
          draft: "false",
          html_url: "https://url",
          labels: "Ham",
          locked: "false",
          merge_commit_sha: "2fd4e1c67a2d28fced849ee1bb76e7391b93eb12",
          merged_at: "",
          number: "1",
          state: "open",
          title: '"title"',
          updated_at: "1981-01-01T00:00:00Z",
          was_cancelled: "false",
        });
      }, join(outputDir, getPullOutputName("all-pull-request-data.csv")));
    });
  }, {
    githubClientData: {
      pulls: [
        getFakePull({ number: 1, created_at: "1981-01-01T00:00:00Z" }),
      ],
    },
    expectedFiles: ["all-pull-request-data.csv"],
  });

  await withOutputToCsv(t, "with a multi-line body", async ({ outputDir, t }) => {
    await t.step("encodes body column", async () => {
      // ↑ encoded to avoid outputting literal newlines that can confuse the csv format
      await withCsvContent((content) => {
        assertEquals(content.length, 1);
        assertEquals(content[0].body, '"multiline\\nbody"');
      }, join(outputDir, getPullOutputName("all-pull-request-data.csv")));
    });
  }, {
    githubClientData: {
      pulls: [
        getFakePull({ number: 1, body: "multiline\nbody" }),
      ],
    },
    expectedFiles: ["all-pull-request-data.csv"],
  });

  await withOutputToCsv(t, "with a pull that's closed but not merged", async ({ outputDir, t }) => {
    await t.step("sets was_cancelled to true", async () => {
      // ↑ encoded to avoid outputting literal newlines that can confuse the csv format
      await withCsvContent((content) => {
        assertEquals(content.length, 1);
        assertEquals(content[0].was_cancelled, "true");
      }, join(outputDir, getPullOutputName("all-pull-request-data.csv")));
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
    },
    expectedFiles: ["all-pull-request-data.csv"],
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
        });
      }, join(outputDir, getPullOutputName("pull-request-lead-times-daily.csv")));
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
        });
      }, join(outputDir, getPullOutputName("pull-request-lead-times-weekly.csv")));
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
        });
      }, join(outputDir, getPullOutputName("pull-request-lead-times-monthly.csv")));
    });
  }, {
    githubClientData: {
      pulls: [
        getFakePull({ number: 4, created_at: "1984-01-01T00:00:00Z", merged_at: "1984-01-05T00:00:00Z" }),
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
    expectedFiles: ["workflows/Name/histogram-daily.csv"],
  });
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
