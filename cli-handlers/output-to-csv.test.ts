import { getFakePull } from "../github/testing.ts";
import { GithubDiskCacheInfo, GithubPull } from "../github/types.ts";

import { asserts } from "../dev-deps.ts";
import { asyncToArray } from "../utils.ts";
import { csv, path } from "../deps.ts";
import { ensureFiles, pathExists, withFileOpen, withTempDir } from "../path-and-file-utils.ts";

import { outputToCsv } from "./output-to-csv.ts";
import { DeepPartial } from "../types.ts";

Deno.test("syncToCsv", async (t) => {
  async function createFakeGithubCache(dir: string, { ghPulls }: Partial<{
    ghPulls: Array<DeepPartial<GithubPull>>
  }> = {}): Promise<void> {
    await ensureFiles(dir, [
      {
        file: "data/github/owner/repo/info.json",
        data: <GithubDiskCacheInfo>{ "updatedAt": 1666535574032 }
      },
      ...(ghPulls || []).map((pull, i) => {
        const pullNumber = pull.number ?? i + 1;
        return {
          file: `data/github/owner/repo/pulls/${pullNumber}.json`,
          data: <GithubPull>getFakePull({ ...pull, number: pullNumber })
        };
      })
    ]);
  }

  async function withCsvContent(callback: (content: Array<{ [key: string]: string }>) => void, filepath: string) {
    await withFileOpen(async (f) => {
      const content = await asyncToArray(csv.readCSVObjects(f));
      await callback(content);
    }, filepath);
  }

  await withTempDir(async p => {
    const fakePulls: Record<string, DeepPartial<GithubPull>> = {
      simple: { number: 1, created_at: "0001-01-01T00:00:00Z" },
      multiline: { number: 2, created_at: "0002-01-01T00:00:00Z", body: "multiline\nbody" },
      cancelled: { number: 3, created_at: "0003-01-01T00:00:00Z", closed_at: "0003-01-02T00:00:00Z", merged_at: null },
      merged: { number: 4, created_at: "0004-01-01T00:00:00Z", merged_at: "0004-01-05T00:00:00Z" },
    };

    await createFakeGithubCache(p, {
      ghPulls: Object.values(fakePulls)
    });
    const outputDir = path.join(p, "out");

    await t.step("can be called", async () => {
      await outputToCsv({
        github: { owner: "owner", repo: "repo" },
        outputDir,
        root: p,
      });
    });

    const expectedFiles = {
      "all-pr-data.csv": path.join(outputDir, "all-pull-request-data.csv"),
      "daily-pr-lead-times.csv": path.join(outputDir, "daily-pull-request-lead-times.csv"),
    } as const;

    for (const [key, val] of Object.entries(expectedFiles)) {
      await t.step(`outputs expected file ${key}`, async () => {
        asserts.assertEquals(
          await pathExists(val), true,
          `Could not find '${path.relative(outputDir, val)}', got: ${(await asyncToArray(await Deno.readDir(outputDir))).map(el => el.name).join(", ")}`
        );
      });
    }

    await t.step("output.csv", async (t) => {
      const expectedFile = expectedFiles["all-pr-data.csv"];

      await t.step("has expected format", async () => {
        await withCsvContent(content => {
          asserts.assertEquals(content.length, Object.keys(fakePulls).length);
          const contentEl = content[Object.keys(fakePulls).indexOf("simple")];
          asserts.assertEquals(contentEl, {
            _links: JSON.stringify({
              html: { href: "https://url" },
              self: { href: "https://url" },
              commits: { href: `https://api.github.com/repos/owner/repo/pulls/1/commits` },
              statuses: { href: "https://api.github.com/repos/owner/repo/statuses/da39a3ee5e6b4b0d3255bfef95601890afd80709" },
            }),
            base: `{"label":"Foo:main","ref":"main","sha":"de9f2c7fd25e1b3afad3e85a0bd17d9b100db4b3"}`,
            body: "",
            closed_at: "",
            created_at: "0001-01-01T00:00:00Z",
            draft: "false",
            html_url: "https://url",
            labels: "Ham",
            locked: "false",
            merge_commit_sha: "2fd4e1c67a2d28fced849ee1bb76e7391b93eb12",
            merged_at: "",
            number: "1",
            state: "open",
            title: JSON.stringify("title"),
            updated_at: "0001-01-01T00:00:00Z",
            was_cancelled: "false",
          });
        }, expectedFile);
      });

      await t.step("encodes body column", async () => {
        // ↑ encoded to avoid outputting literal newlines that can confuse the csv format
        await withCsvContent(content => {
          const contentEl = content[Object.keys(fakePulls).indexOf("multiline")];
          asserts.assertEquals(contentEl.body, JSON.stringify("multiline\nbody"));
        }, expectedFile);
      });

      await t.step("sets was_cancelled as true when pull was closed but not merged", async () => {
        await withCsvContent(content => {
          const simpleEL = content[Object.keys(fakePulls).indexOf("simple")];
          asserts.assertEquals(simpleEL.was_cancelled, "false",
            `should not be cancelled: ${JSON.stringify(simpleEL, null, 2)}`);
          const cancelledEl = content[Object.keys(fakePulls).indexOf("cancelled")];
          asserts.assertEquals(cancelledEl.was_cancelled, "true",
            `should be cancelled: ${JSON.stringify(cancelledEl, null, 2)}`);
        }, expectedFile);
      });
    });

    await t.step("daily-pr-lead-times.csv", async (t) => {
      const expectedFile = expectedFiles["daily-pr-lead-times.csv"];

      await t.step("has expected format", async () => {
        await withCsvContent(content => {
          const contentEl = content[0];
          asserts.assertEquals(contentEl, {
            "Day": "0004-01-05T00:00:00.000Z",
            "# of PRs Merged": "1",
            "Merged PRs": "4",
            "Lead Time (in days)": "5.0",
          });
        }, expectedFile);
      });
    });
  });
});
