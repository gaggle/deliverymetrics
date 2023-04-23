import { assertEquals, assertObjectMatch } from "dev:asserts"
import { join } from "std:path"
import { readCSVObjects } from "csv"
import { stub } from "dev:mock"

import { createFakeReadonlyGithubClient, getFakePull, getFakeSyncInfo } from "../../libs/github/testing.ts"
import { withFileOpen, withTempDir, yieldDir } from "../../libs/utils/path-and-file-utils.ts"

import { asyncToArray, single } from "../../libs/utils/mod.ts"

import { withStubs } from "../../libs/dev-utils.ts"

import { _internals, reportHandler } from "./report-handler.ts"

/**
 * This sets up a test context and calls `reportHandler`, passing back the output directory.
 *
 * Convenience function to slim down the tests.
 */
async function withReportHandler(
  t: Deno.TestContext,
  name: string,
  callable: (opts: { outputDir: string; t: Deno.TestContext }) => Promise<void>,
  { githubClientData, expectedFiles }: Partial<{
    githubClientData: Parameters<typeof createFakeReadonlyGithubClient>[0]
    expectedFiles: Array<string> | Readonly<Array<string>>
  }>,
): Promise<void> {
  await t.step(name, async (t) => {
    await withTempDir(async (outputDir) => {
      await withStubs(
        async () => {
          await t.step("runs outputToCsv without error", async () => {
            await reportHandler({
              github: { owner: "owner", repo: "repo" },
              outputDir,
              cacheRoot: "persistenceRoot",
            })
          })

          if (expectedFiles) {
            await t.step("outputs the expected files", async () => {
              const actual = await asyncToArray(yieldDir(outputDir))
              const expected = Array.from(expectedFiles)
              assertEquals(actual.sort(), expected.sort())
            })
          }

          await callable({ outputDir, t })
        },
        stub(
          _internals,
          "getGithubClient",
          () => createFakeReadonlyGithubClient(githubClientData),
        ),
      )
    })
  })
}

const pullOutputNames = [
  "github-pulls-data.csv",
  "pull-request-lead-times-daily.csv",
  "pull-request-lead-times-monthly.csv",
  "pull-request-lead-times-weekly.csv",
] as const

type PullOutputName = typeof pullOutputNames[number]

function getPullOutputName(el: PullOutputName): PullOutputName {
  const idx = pullOutputNames.indexOf(el)
  return pullOutputNames[idx]
}

Deno.test({
  fn: async (t) => {
    await withReportHandler(t, "with a simple pull", async ({ outputDir, t }) => {
      await t.step("formats all pull request data as expected", async () => {
        await withCsvContent((content) => {
          assertEquals(content.length, 1)

          assertEquals(Object.keys(content[0]).sort(), [
            "Commits Authors",
            "Commits Committers",
            "Commits Count",
            "Head Ref",
            "Lead Time (in days)",
            "Time to Merge (in days)",
            "Was Cancelled?",
            "_links",
            "base",
            "body",
            "closed_at",
            "comments_url",
            "commits_url",
            "created_at",
            "draft",
            "head",
            "html_url",
            "id",
            "labels",
            "locked",
            "merge_commit_sha",
            "merged_at",
            "node_id",
            "number",
            "review_comment_url",
            "review_comments_url",
            "state",
            "statuses_url",
            "title",
            "updated_at",
            "url",
          ])

          assertObjectMatch(content[0], {
            "Commits Authors": "",
            "Commits Committers": "",
            "Commits Count": "0",
            "Head Ref": "fix/FOO-01",
            "Lead Time (in days)": "1.0",
            "Time to Merge (in days)": "",
            "Was Cancelled?": "false",
          })
        }, join(outputDir, getPullOutputName("github-pulls-data.csv")))
      })
    }, {
      githubClientData: {
        pulls: [
          getFakePull({ number: 1, created_at: "1981-01-01T00:00:00Z" }),
        ],
        syncInfos: [
          getFakeSyncInfo({
            type: "pull",
            createdAt: new Date("1981-01-01T00:00:00Z").getTime(),
            updatedAt: new Date("1981-01-01T00:00:00Z").getTime(),
          }),
        ],
      },
      expectedFiles: ["github-pulls-data.csv"],
    })

    await withReportHandler(t, "with a pull that's closed but not merged", async ({ outputDir, t }) => {
      await t.step('sets "Was Cancelled?" to true', async () => {
        // ↑ encoded to avoid outputting literal newlines that can confuse the csv format
        await withCsvContent((content) => {
          assertEquals(content.length, 1)
          assertEquals(content[0]["Was Cancelled?"], "true")
        }, join(outputDir, getPullOutputName("github-pulls-data.csv")))
      })
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
      expectedFiles: ["github-pulls-data.csv"],
    })

    await withReportHandler(t, "with two closed pulls", async ({ outputDir, t }) => {
      await t.step("formats daily pull-request lead times as expected", async () => {
        await withCsvContent((content) => {
          assertEquals(single(content), {
            "Period Start": "1984-01-05T00:00:00.000Z",
            "Period End": "1984-01-05T23:59:59.999Z",
            "# of PRs Merged": "1",
            "Merged PRs": "4",
            "Lead Time (in days)": "5.0",
            "Time to Merge (in days)": "",
          })
        }, join(outputDir, getPullOutputName("pull-request-lead-times-daily.csv")))
      })

      await t.step("formats weekly pull-request lead times as expected", async () => {
        await withCsvContent((content) => {
          assertEquals(single(content), {
            "Period Start": "1984-01-02T00:00:00.000Z",
            "Period End": "1984-01-08T23:59:59.999Z",
            "# of PRs Merged": "1",
            "Merged PRs": "4",
            "Lead Time (in days)": "5.0",
            "Time to Merge (in days)": "",
          })
        }, join(outputDir, getPullOutputName("pull-request-lead-times-weekly.csv")))
      })

      await t.step("formats monthly pull-request lead times as expected", async () => {
        await withCsvContent((content) => {
          assertEquals(single(content), {
            "Period Start": "1984-01-01T00:00:00.000Z",
            "Period End": "1984-01-31T23:59:59.999Z",
            "# of PRs Merged": "1",
            "Merged PRs": "4",
            "Lead Time (in days)": "5.0",
            "Time to Merge (in days)": "",
          })
        }, join(outputDir, getPullOutputName("pull-request-lead-times-monthly.csv")))
      })
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
    })
  },
  // ↑ `progress` registers an exit-handler which gets flagged by sanitization, I... think it's harmless though 😬
  name: "outputToCsv",
  sanitizeOps: false,
})

async function withCsvContent(
  callback: (content: Array<{ [key: string]: string }>) => void,
  filepath: string,
) {
  await withFileOpen(async (f) => {
    const content = await asyncToArray(readCSVObjects(f))
    await callback(content)
  }, filepath)
}
