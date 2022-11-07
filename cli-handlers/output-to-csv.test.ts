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
      "output.csv": path.join(outputDir, "output.csv"),
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
      const expectedFile = expectedFiles["output.csv"];

      await t.step("has expected format", async () => {
        await withCsvContent(content => {
          asserts.assertEquals(content.length, Object.keys(fakePulls).length);
          const contentEl = content[Object.keys(fakePulls).indexOf("simple")];
          asserts.assertEquals(contentEl, {
            number: "1",
            created_at: "0001-01-01T00:00:00Z",
            updated_at: "0001-01-01T00:00:00Z",
            was_cancelled: "false",
            url: "https://url",
            id: "1",
            node_id: "node_id",
            html_url: "https://url",
            state: "open",
            locked: "false",
            title: JSON.stringify("title"),
            body: "",
            closed_at: "",
            merged_at: "",
            draft: "false",
            base: `{"label":"Foo:main","ref":"main","sha":"f357074d2aa6b319ee5475a2abcD65bd1416074d"}`,
            _links: `{"html":{"href":"https://url"},"self":{"href":"https://url"}}`
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
  });
});
