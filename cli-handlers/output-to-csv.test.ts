import { join, relative } from "path";
import { readCSVObjects } from "csv";

import { getFakePull } from "../github/testing.ts";
import { GithubPull, SyncInfo } from "../github/mod.ts";

import { asserts } from "../dev-deps.ts";
import { asyncToArray } from "../utils.ts";
import { DeepPartial } from "../types.ts";
import { ensureFiles, pathExists, withFileOpen, withTempDir } from "../path-and-file-utils.ts";

import { outputToCsv } from "./output-to-csv.ts";

Deno.test("syncToCsv", async (t) => {
  async function createStoredGithubFiles(
    dir: string,
    { pulls, syncs }: Partial<{
      pulls: Array<DeepPartial<GithubPull>>;
      syncs: Array<DeepPartial<SyncInfo>>;
    }> = {},
  ): Promise<void> {
    syncs = syncs || [{ createdAt: 283996800000, updatedAt: 283996800001 }];
    //                             ↑ 1979-01-01T00:00:00Z

    pulls = (pulls || []).map((pull, idx) => {
      const pullNumber = pull.number ?? idx + 1;
      return <GithubPull> getFakePull({ ...pull, number: pullNumber });
    });

    await ensureFiles(dir, [
      {
        file: "github/owner/repo/pulls.json",
        data: pulls,
      },
      {
        file: "github/owner/repo/syncs.json",
        data: syncs,
      },
    ]);
  }

  async function withCsvContent(
    callback: (content: Array<{ [key: string]: string }>) => void,
    filepath: string,
  ) {
    await withFileOpen(async (f) => {
      const content = await asyncToArray(readCSVObjects(f));
      await callback(content);
    }, filepath);
  }

  await withTempDir(async (p) => {
    const fakePulls: Record<string, DeepPartial<GithubPull>> = {
      simple: { number: 1, created_at: "1981-01-01T00:00:00Z" },
      multiline: {
        number: 2,
        created_at: "1982-01-01T00:00:00Z",
        body: "multiline\nbody",
      },
      cancelled: {
        number: 3,
        created_at: "1983-01-01T00:00:00Z",
        closed_at: "1983-01-02T00:00:00Z",
        merged_at: null,
      },
      merged: {
        number: 4,
        created_at: "1984-01-01T00:00:00Z",
        merged_at: "1984-01-05T00:00:00Z",
      },
    };

    await createStoredGithubFiles(p, {
      syncs: [{
        createdAt: new Date("1981-01-01T00:00:00Z").getTime(),
        updatedAt: new Date("1984-01-05T00:00:00Z").getTime(),
      }],
      pulls: Object.values(fakePulls),
    });
    const outputDir = join(p, "out");

    await t.step("can be called", async () => {
      await outputToCsv({
        github: { owner: "owner", repo: "repo" },
        outputDir,
        persistenceRoot: p,
      });
    });

    const expectedFiles = {
      "all-pr-data.csv": join(outputDir, "all-pull-request-data.csv"),
      "pr-lead-times-daily.csv": join(
        outputDir,
        "pull-request-lead-times-daily.csv",
      ),
      "pr-lead-times-weekly.csv": join(
        outputDir,
        "pull-request-lead-times-weekly.csv",
      ),
      "pr-lead-times-monthly.csv": join(
        outputDir,
        "pull-request-lead-times-monthly.csv",
      ),
    } as const;

    for (const [key, val] of Object.entries(expectedFiles)) {
      await t.step(`outputs expected file ${key}`, async () => {
        asserts.assertEquals(
          await pathExists(val),
          true,
          `Could not find '${relative(outputDir, val)}', got: ${
            (await asyncToArray(await Deno.readDir(outputDir))).map((el) => el.name).join(", ")
          }`,
        );
      });
    }

    await t.step("all-pr-data.csv", async (t) => {
      const expectedFile = expectedFiles["all-pr-data.csv"];

      await t.step("has expected format", async () => {
        await withCsvContent((content) => {
          asserts.assertEquals(
            content.length,
            Object.keys(fakePulls).length,
            `Expected ${Object.keys(fakePulls).length} content elements but got ${content.length}: ${
              JSON.stringify(content, null, 2)
            }`,
          );
          const contentEl = content[Object.keys(fakePulls).indexOf("simple")];
          asserts.assertEquals(contentEl, {
            _links: JSON.stringify({
              html: { href: "https://url" },
              self: { href: "https://url" },
              commits: {
                href: `https://api.github.com/repos/owner/repo/pulls/1/commits`,
              },
              statuses: {
                href: "https://api.github.com/repos/owner/repo/statuses/da39a3ee5e6b4b0d3255bfef95601890afd80709",
              },
            }),
            base: `{"label":"Foo:main","ref":"main","sha":"de9f2c7fd25e1b3afad3e85a0bd17d9b100db4b3"}`,
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
            title: JSON.stringify("title"),
            updated_at: "1981-01-01T00:00:00Z",
            was_cancelled: "false",
          });
        }, expectedFile);
      });

      await t.step("encodes body column", async () => {
        // ↑ encoded to avoid outputting literal newlines that can confuse the csv format
        await withCsvContent((content) => {
          const contentEl = content[Object.keys(fakePulls).indexOf("multiline")];
          asserts.assertEquals(
            contentEl.body,
            JSON.stringify("multiline\nbody"),
          );
        }, expectedFile);
      });

      await t.step(
        "sets was_cancelled as true when pull was closed but not merged",
        async () => {
          await withCsvContent((content) => {
            const simpleEL = content[Object.keys(fakePulls).indexOf("simple")];
            asserts.assertEquals(
              simpleEL.was_cancelled,
              "false",
              `should not be cancelled: ${JSON.stringify(simpleEL, null, 2)}`,
            );
            const cancelledEl = content[Object.keys(fakePulls).indexOf("cancelled")];
            asserts.assertEquals(
              cancelledEl.was_cancelled,
              "true",
              `should be cancelled: ${JSON.stringify(cancelledEl, null, 2)}`,
            );
          }, expectedFile);
        },
      );
    });

    await t.step("pr-lead-times-daily.csv", async (t) => {
      const expectedFile = expectedFiles["pr-lead-times-daily.csv"];

      await t.step("has expected format", async () => {
        await withCsvContent((content) => {
          const contentEl = content[0];
          asserts.assertEquals(contentEl, {
            "Period Start": "1984-01-05T00:00:00.000Z",
            "Period End": "1984-01-05T23:59:59.999Z",
            "# of PRs Merged": "1",
            "Merged PRs": "4",
            "Lead Time (in days)": "5.0",
          });
        }, expectedFile);
      });
    });

    await t.step("pr-lead-times-weekly.csv", async (t) => {
      const expectedFile = expectedFiles["pr-lead-times-weekly.csv"];

      await t.step("has expected format", async () => {
        await withCsvContent((content) => {
          const contentEl = content[0];
          asserts.assertEquals(contentEl, {
            "Period Start": "1984-01-02T00:00:00.000Z",
            "Period End": "1984-01-08T23:59:59.999Z",
            "# of PRs Merged": "1",
            "Merged PRs": "4",
            "Lead Time (in days)": "5.0",
          });
        }, expectedFile);
      });
    });

    await t.step("pr-lead-times-monthly.csv", async (t) => {
      const expectedFile = expectedFiles["pr-lead-times-monthly.csv"];

      await t.step("has expected format", async () => {
        await withCsvContent((content) => {
          const contentEl = content[0];
          asserts.assertEquals(contentEl, {
            "Period Start": "1984-01-01T00:00:00.000Z",
            "Period End": "1984-01-31T23:59:59.999Z",
            "# of PRs Merged": "1",
            "Merged PRs": "4",
            "Lead Time (in days)": "5.0",
          });
        }, expectedFile);
      });
    });
  });
});
