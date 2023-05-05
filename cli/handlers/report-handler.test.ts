import { assertEquals, assertObjectMatch } from "dev:asserts"
import { join } from "std:path"
import { readCSVObjects } from "csv"
import { stub } from "dev:mock"

import { createFakeReadonlyGithubClient, getFakePull, getFakeSyncInfo } from "../../libs/github/testing.ts"
import { asyncToArray, single, withFileOpen, withTempDir, yieldDir } from "../../libs/utils/mod.ts"

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
            "_links.commits.href",
            "_links.html.href",
            "_links.self.href",
            "_links.statuses.href",
            "base.label",
            "base.ref",
            "base.repo.allow_forking",
            "base.repo.archive_url",
            "base.repo.archived",
            "base.repo.assignees_url",
            "base.repo.blobs_url",
            "base.repo.branches_url",
            "base.repo.clone_url",
            "base.repo.collaborators_url",
            "base.repo.comments_url",
            "base.repo.commits_url",
            "base.repo.compare_url",
            "base.repo.contents_url",
            "base.repo.contributors_url",
            "base.repo.created_at",
            "base.repo.default_branch",
            "base.repo.deployments_url",
            "base.repo.description",
            "base.repo.disabled",
            "base.repo.downloads_url",
            "base.repo.events_url",
            "base.repo.fork",
            "base.repo.forks",
            "base.repo.forks_count",
            "base.repo.forks_url",
            "base.repo.full_name",
            "base.repo.git_commits_url",
            "base.repo.git_refs_url",
            "base.repo.git_tags_url",
            "base.repo.git_url",
            "base.repo.has_discussions",
            "base.repo.has_downloads",
            "base.repo.has_issues",
            "base.repo.has_pages",
            "base.repo.has_projects",
            "base.repo.has_wiki",
            "base.repo.homepage",
            "base.repo.hooks_url",
            "base.repo.html_url",
            "base.repo.id",
            "base.repo.is_template",
            "base.repo.issue_comment_url",
            "base.repo.issue_events_url",
            "base.repo.issues_url",
            "base.repo.keys_url",
            "base.repo.labels_url",
            "base.repo.language",
            "base.repo.languages_url",
            "base.repo.license",
            "base.repo.merges_url",
            "base.repo.milestones_url",
            "base.repo.mirror_url",
            "base.repo.name",
            "base.repo.notifications_url",
            "base.repo.open_issues",
            "base.repo.open_issues_count",
            "base.repo.private",
            "base.repo.pulls_url",
            "base.repo.pushed_at",
            "base.repo.releases_url",
            "base.repo.size",
            "base.repo.ssh_url",
            "base.repo.stargazers_count",
            "base.repo.stargazers_url",
            "base.repo.statuses_url",
            "base.repo.subscribers_url",
            "base.repo.subscription_url",
            "base.repo.svn_url",
            "base.repo.tags_url",
            "base.repo.teams_url",
            "base.repo.topics",
            "base.repo.trees_url",
            "base.repo.updated_at",
            "base.repo.url",
            "base.repo.visibility",
            "base.repo.watchers",
            "base.repo.watchers_count",
            "base.repo.web_commit_signoff_required",
            "base.sha",
            "body",
            "closed_at",
            "comments_url",
            "commits_url",
            "created_at",
            "draft",
            "head.label",
            "head.ref",
            "head.repo.allow_forking",
            "head.repo.archive_url",
            "head.repo.archived",
            "head.repo.assignees_url",
            "head.repo.blobs_url",
            "head.repo.branches_url",
            "head.repo.clone_url",
            "head.repo.collaborators_url",
            "head.repo.comments_url",
            "head.repo.commits_url",
            "head.repo.compare_url",
            "head.repo.contents_url",
            "head.repo.contributors_url",
            "head.repo.created_at",
            "head.repo.default_branch",
            "head.repo.deployments_url",
            "head.repo.description",
            "head.repo.disabled",
            "head.repo.downloads_url",
            "head.repo.events_url",
            "head.repo.fork",
            "head.repo.forks",
            "head.repo.forks_count",
            "head.repo.forks_url",
            "head.repo.full_name",
            "head.repo.git_commits_url",
            "head.repo.git_refs_url",
            "head.repo.git_tags_url",
            "head.repo.git_url",
            "head.repo.has_discussions",
            "head.repo.has_downloads",
            "head.repo.has_issues",
            "head.repo.has_pages",
            "head.repo.has_projects",
            "head.repo.has_wiki",
            "head.repo.homepage",
            "head.repo.hooks_url",
            "head.repo.html_url",
            "head.repo.id",
            "head.repo.is_template",
            "head.repo.issue_comment_url",
            "head.repo.issue_events_url",
            "head.repo.issues_url",
            "head.repo.keys_url",
            "head.repo.labels_url",
            "head.repo.language",
            "head.repo.languages_url",
            "head.repo.license",
            "head.repo.merges_url",
            "head.repo.milestones_url",
            "head.repo.mirror_url",
            "head.repo.name",
            "head.repo.notifications_url",
            "head.repo.open_issues",
            "head.repo.open_issues_count",
            "head.repo.private",
            "head.repo.pulls_url",
            "head.repo.pushed_at",
            "head.repo.releases_url",
            "head.repo.size",
            "head.repo.ssh_url",
            "head.repo.stargazers_count",
            "head.repo.stargazers_url",
            "head.repo.statuses_url",
            "head.repo.subscribers_url",
            "head.repo.subscription_url",
            "head.repo.svn_url",
            "head.repo.tags_url",
            "head.repo.teams_url",
            "head.repo.topics",
            "head.repo.trees_url",
            "head.repo.updated_at",
            "head.repo.url",
            "head.repo.visibility",
            "head.repo.watchers",
            "head.repo.watchers_count",
            "head.repo.web_commit_signoff_required",
            "head.sha",
            "head.user.avatar_url",
            "head.user.events_url",
            "head.user.followers_url",
            "head.user.following_url",
            "head.user.gists_url",
            "head.user.gravatar_id",
            "head.user.html_url",
            "head.user.id",
            "head.user.login",
            "head.user.node_id",
            "head.user.organizations_url",
            "head.user.received_events_url",
            "head.user.repos_url",
            "head.user.site_admin",
            "head.user.starred_url",
            "head.user.subscriptions_url",
            "head.user.type",
            "head.user.url",
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
