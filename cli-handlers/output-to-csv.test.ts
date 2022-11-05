import { getFakePull } from "../github/testing.ts";
import { GithubDiskCacheInfo, GithubPull } from "../github/types.ts";

import { asserts } from "../dev-deps.ts";
import { asyncToArray } from "../utils.ts";
import { csv, path } from "../deps.ts";
import { ensureFiles, withFileOpen, withTempDir } from "../path-and-file-utils.ts";

import { outputToCsv } from "./output-to-csv.ts";
import { DeepPartial } from "../types.ts";

Deno.test("syncToCsv", async (t) => {
    async function createFakeGithubCache(dir: string, gh?: DeepPartial<GithubPull>): Promise<void> {
      await ensureFiles(dir, [
        {
          file: "data/github/owner/repo/info.json",
          data: <GithubDiskCacheInfo>{ "updatedAt": 1666535574032 }
        },
        {
          file: "data/github/owner/repo/pulls/1.json",
          data: <GithubPull>getFakePull(gh)
        },
      ]);
    }

    async function withCsvContent(callback: (content: Array<{ [key: string]: string }>) => void, filepath: string) {
      await withFileOpen(async (f) => {
        const content = await asyncToArray(csv.readCSVObjects(f));
        await callback(content);
      }, filepath);
    }

    await t.step("outputs pull data as csv", async () => {
      await withTempDir(async p => {
        await createFakeGithubCache(p, { number: 1, created_at: "2021-10-25T20:35:29Z", });
        const outputDir = path.join(p, "out");

        await outputToCsv({
          github: { owner: "owner", repo: "repo" },
          outputDir,
          root: p,
        });

        await withCsvContent(content => {
          asserts.assertEquals(content.length, 1);
          asserts.assertEquals(content[0], {
            number: "1",
            created_at: "2021-10-25T20:35:29Z",
            updated_at: "2022-10-03T20:26:18Z",
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
            base: `{"label":"Foo:main","ref":"main","sha":"f357074d2aa6b319ee5475a2bafb65bd1416074d"}`,
            _links: `{"html":{"href":"https://url"},"self":{"href":"https://url"}}`
          });
        }, path.join(outputDir, "output.csv"));
      });
    });

    await t.step("outputs encoded body", async () => {
      // ↑ encoded to avoid outputting literal newlines that can confuse the csv format
      await withTempDir(async root => {
        await createFakeGithubCache(root, { number: 1, created_at: "2021-10-25T20:35:29Z", body: "multiline\nbody" });
        const outputDir = path.join(root, "out");

        await outputToCsv({
          github: { owner: "owner", repo: "repo" },
          outputDir,
          root,
        });

        await withCsvContent(content => {
          asserts.assertEquals(content[0].body, JSON.stringify("multiline\nbody"));
        }, path.join(outputDir, "output.csv"));
      });
    });

    await t.step("sets was_cancelled as true when pull was closed but not merged", async () => {
      await withTempDir(async root => {
        await createFakeGithubCache(root, { number: 1, closed_at: "2021-10-25T20:35:29Z", merged_at: null });
        const outputDir = path.join(root, "out");

        await outputToCsv({
          github: { owner: "owner", repo: "repo" },
          outputDir,
          root,
        });

        await withCsvContent(content => {
          asserts.assertEquals(content[0].was_cancelled, "true");
        }, path.join(outputDir, "output.csv"));
      });
    });
  }
);
