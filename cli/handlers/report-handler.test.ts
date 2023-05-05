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
            "_links.comments.href",
            "_links.commits.href",
            "_links.html.href",
            "_links.issue.href",
            "_links.review_comment.href",
            "_links.review_comments.href",
            "_links.self.href",
            "_links.statuses.href",
            "active_lock_reason",
            "assignee.avatar_url",
            "assignee.email",
            "assignee.events_url",
            "assignee.followers_url",
            "assignee.following_url",
            "assignee.gists_url",
            "assignee.gravatar_id",
            "assignee.html_url",
            "assignee.id",
            "assignee.login",
            "assignee.name",
            "assignee.node_id",
            "assignee.organizations_url",
            "assignee.received_events_url",
            "assignee.repos_url",
            "assignee.site_admin",
            "assignee.starred_at",
            "assignee.starred_url",
            "assignee.subscriptions_url",
            "assignee.type",
            "assignee.url",
            "assignees",
            "author_association",
            "auto_merge.commit_message",
            "auto_merge.commit_title",
            "auto_merge.enabled_by.avatar_url",
            "auto_merge.enabled_by.email",
            "auto_merge.enabled_by.events_url",
            "auto_merge.enabled_by.followers_url",
            "auto_merge.enabled_by.following_url",
            "auto_merge.enabled_by.gists_url",
            "auto_merge.enabled_by.gravatar_id",
            "auto_merge.enabled_by.html_url",
            "auto_merge.enabled_by.id",
            "auto_merge.enabled_by.login",
            "auto_merge.enabled_by.name",
            "auto_merge.enabled_by.node_id",
            "auto_merge.enabled_by.organizations_url",
            "auto_merge.enabled_by.received_events_url",
            "auto_merge.enabled_by.repos_url",
            "auto_merge.enabled_by.site_admin",
            "auto_merge.enabled_by.starred_at",
            "auto_merge.enabled_by.starred_url",
            "auto_merge.enabled_by.subscriptions_url",
            "auto_merge.enabled_by.type",
            "auto_merge.enabled_by.url",
            "auto_merge.merge_method",
            "base.label",
            "base.ref",
            "base.repo.allow_auto_merge",
            "base.repo.allow_forking",
            "base.repo.allow_merge_commit",
            "base.repo.allow_rebase_merge",
            "base.repo.allow_squash_merge",
            "base.repo.allow_update_branch",
            "base.repo.anonymous_access_enabled",
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
            "base.repo.delete_branch_on_merge",
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
            "base.repo.license.html_url",
            "base.repo.license.key",
            "base.repo.license.name",
            "base.repo.license.node_id",
            "base.repo.license.spdx_id",
            "base.repo.license.url",
            "base.repo.master_branch",
            "base.repo.merge_commit_message",
            "base.repo.merge_commit_title",
            "base.repo.merges_url",
            "base.repo.milestones_url",
            "base.repo.mirror_url",
            "base.repo.name",
            "base.repo.network_count",
            "base.repo.node_id",
            "base.repo.notifications_url",
            "base.repo.open_issues",
            "base.repo.open_issues_count",
            "base.repo.organization.avatar_url",
            "base.repo.organization.email",
            "base.repo.organization.events_url",
            "base.repo.organization.followers_url",
            "base.repo.organization.following_url",
            "base.repo.organization.gists_url",
            "base.repo.organization.gravatar_id",
            "base.repo.organization.html_url",
            "base.repo.organization.id",
            "base.repo.organization.login",
            "base.repo.organization.name",
            "base.repo.organization.node_id",
            "base.repo.organization.organizations_url",
            "base.repo.organization.received_events_url",
            "base.repo.organization.repos_url",
            "base.repo.organization.site_admin",
            "base.repo.organization.starred_at",
            "base.repo.organization.starred_url",
            "base.repo.organization.subscriptions_url",
            "base.repo.organization.type",
            "base.repo.organization.url",
            "base.repo.owner.avatar_url",
            "base.repo.owner.email",
            "base.repo.owner.events_url",
            "base.repo.owner.followers_url",
            "base.repo.owner.following_url",
            "base.repo.owner.gists_url",
            "base.repo.owner.gravatar_id",
            "base.repo.owner.html_url",
            "base.repo.owner.id",
            "base.repo.owner.login",
            "base.repo.owner.name",
            "base.repo.owner.node_id",
            "base.repo.owner.organizations_url",
            "base.repo.owner.received_events_url",
            "base.repo.owner.repos_url",
            "base.repo.owner.site_admin",
            "base.repo.owner.starred_at",
            "base.repo.owner.starred_url",
            "base.repo.owner.subscriptions_url",
            "base.repo.owner.type",
            "base.repo.owner.url",
            "base.repo.permissions.admin",
            "base.repo.permissions.maintain",
            "base.repo.permissions.pull",
            "base.repo.permissions.push",
            "base.repo.permissions.triage",
            "base.repo.private",
            "base.repo.pulls_url",
            "base.repo.pushed_at",
            "base.repo.releases_url",
            "base.repo.size",
            "base.repo.squash_merge_commit_message",
            "base.repo.squash_merge_commit_title",
            "base.repo.ssh_url",
            "base.repo.stargazers_count",
            "base.repo.stargazers_url",
            "base.repo.starred_at",
            "base.repo.statuses_url",
            "base.repo.subscribers_count",
            "base.repo.subscribers_url",
            "base.repo.subscription_url",
            "base.repo.svn_url",
            "base.repo.tags_url",
            "base.repo.teams_url",
            "base.repo.temp_clone_token",
            "base.repo.template_repository.allow_auto_merge",
            "base.repo.template_repository.allow_merge_commit",
            "base.repo.template_repository.allow_rebase_merge",
            "base.repo.template_repository.allow_squash_merge",
            "base.repo.template_repository.allow_update_branch",
            "base.repo.template_repository.archive_url",
            "base.repo.template_repository.archived",
            "base.repo.template_repository.assignees_url",
            "base.repo.template_repository.blobs_url",
            "base.repo.template_repository.branches_url",
            "base.repo.template_repository.clone_url",
            "base.repo.template_repository.collaborators_url",
            "base.repo.template_repository.comments_url",
            "base.repo.template_repository.commits_url",
            "base.repo.template_repository.compare_url",
            "base.repo.template_repository.contents_url",
            "base.repo.template_repository.contributors_url",
            "base.repo.template_repository.created_at",
            "base.repo.template_repository.default_branch",
            "base.repo.template_repository.delete_branch_on_merge",
            "base.repo.template_repository.deployments_url",
            "base.repo.template_repository.description",
            "base.repo.template_repository.disabled",
            "base.repo.template_repository.downloads_url",
            "base.repo.template_repository.events_url",
            "base.repo.template_repository.fork",
            "base.repo.template_repository.forks_count",
            "base.repo.template_repository.forks_url",
            "base.repo.template_repository.full_name",
            "base.repo.template_repository.git_commits_url",
            "base.repo.template_repository.git_refs_url",
            "base.repo.template_repository.git_tags_url",
            "base.repo.template_repository.git_url",
            "base.repo.template_repository.has_downloads",
            "base.repo.template_repository.has_issues",
            "base.repo.template_repository.has_pages",
            "base.repo.template_repository.has_projects",
            "base.repo.template_repository.has_wiki",
            "base.repo.template_repository.homepage",
            "base.repo.template_repository.hooks_url",
            "base.repo.template_repository.html_url",
            "base.repo.template_repository.id",
            "base.repo.template_repository.is_template",
            "base.repo.template_repository.issue_comment_url",
            "base.repo.template_repository.issue_events_url",
            "base.repo.template_repository.issues_url",
            "base.repo.template_repository.keys_url",
            "base.repo.template_repository.labels_url",
            "base.repo.template_repository.language",
            "base.repo.template_repository.languages_url",
            "base.repo.template_repository.merge_commit_message",
            "base.repo.template_repository.merge_commit_title",
            "base.repo.template_repository.merges_url",
            "base.repo.template_repository.milestones_url",
            "base.repo.template_repository.mirror_url",
            "base.repo.template_repository.name",
            "base.repo.template_repository.network_count",
            "base.repo.template_repository.node_id",
            "base.repo.template_repository.notifications_url",
            "base.repo.template_repository.open_issues_count",
            "base.repo.template_repository.owner.avatar_url",
            "base.repo.template_repository.owner.events_url",
            "base.repo.template_repository.owner.followers_url",
            "base.repo.template_repository.owner.following_url",
            "base.repo.template_repository.owner.gists_url",
            "base.repo.template_repository.owner.gravatar_id",
            "base.repo.template_repository.owner.html_url",
            "base.repo.template_repository.owner.id",
            "base.repo.template_repository.owner.login",
            "base.repo.template_repository.owner.node_id",
            "base.repo.template_repository.owner.organizations_url",
            "base.repo.template_repository.owner.received_events_url",
            "base.repo.template_repository.owner.repos_url",
            "base.repo.template_repository.owner.site_admin",
            "base.repo.template_repository.owner.starred_url",
            "base.repo.template_repository.owner.subscriptions_url",
            "base.repo.template_repository.owner.type",
            "base.repo.template_repository.owner.url",
            "base.repo.template_repository.permissions.admin",
            "base.repo.template_repository.permissions.maintain",
            "base.repo.template_repository.permissions.pull",
            "base.repo.template_repository.permissions.push",
            "base.repo.template_repository.permissions.triage",
            "base.repo.template_repository.private",
            "base.repo.template_repository.pulls_url",
            "base.repo.template_repository.pushed_at",
            "base.repo.template_repository.releases_url",
            "base.repo.template_repository.size",
            "base.repo.template_repository.squash_merge_commit_message",
            "base.repo.template_repository.squash_merge_commit_title",
            "base.repo.template_repository.ssh_url",
            "base.repo.template_repository.stargazers_count",
            "base.repo.template_repository.stargazers_url",
            "base.repo.template_repository.statuses_url",
            "base.repo.template_repository.subscribers_count",
            "base.repo.template_repository.subscribers_url",
            "base.repo.template_repository.subscription_url",
            "base.repo.template_repository.svn_url",
            "base.repo.template_repository.tags_url",
            "base.repo.template_repository.teams_url",
            "base.repo.template_repository.temp_clone_token",
            "base.repo.template_repository.topics",
            "base.repo.template_repository.trees_url",
            "base.repo.template_repository.updated_at",
            "base.repo.template_repository.url",
            "base.repo.template_repository.use_squash_pr_title_as_default",
            "base.repo.template_repository.visibility",
            "base.repo.template_repository.watchers_count",
            "base.repo.topics",
            "base.repo.trees_url",
            "base.repo.updated_at",
            "base.repo.url",
            "base.repo.use_squash_pr_title_as_default",
            "base.repo.visibility",
            "base.repo.watchers",
            "base.repo.watchers_count",
            "base.repo.web_commit_signoff_required",
            "base.sha",
            "base.user.avatar_url",
            "base.user.email",
            "base.user.events_url",
            "base.user.followers_url",
            "base.user.following_url",
            "base.user.gists_url",
            "base.user.gravatar_id",
            "base.user.html_url",
            "base.user.id",
            "base.user.login",
            "base.user.name",
            "base.user.node_id",
            "base.user.organizations_url",
            "base.user.received_events_url",
            "base.user.repos_url",
            "base.user.site_admin",
            "base.user.starred_at",
            "base.user.starred_url",
            "base.user.subscriptions_url",
            "base.user.type",
            "base.user.url",
            "body",
            "closed_at",
            "comments_url",
            "commits_url",
            "created_at",
            "diff_url",
            "draft",
            "head.label",
            "head.ref",
            "head.repo.allow_auto_merge",
            "head.repo.allow_forking",
            "head.repo.allow_merge_commit",
            "head.repo.allow_rebase_merge",
            "head.repo.allow_squash_merge",
            "head.repo.allow_update_branch",
            "head.repo.anonymous_access_enabled",
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
            "head.repo.delete_branch_on_merge",
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
            "head.repo.license.html_url",
            "head.repo.license.key",
            "head.repo.license.name",
            "head.repo.license.node_id",
            "head.repo.license.spdx_id",
            "head.repo.license.url",
            "head.repo.master_branch",
            "head.repo.merge_commit_message",
            "head.repo.merge_commit_title",
            "head.repo.merges_url",
            "head.repo.milestones_url",
            "head.repo.mirror_url",
            "head.repo.name",
            "head.repo.network_count",
            "head.repo.node_id",
            "head.repo.notifications_url",
            "head.repo.open_issues",
            "head.repo.open_issues_count",
            "head.repo.organization.avatar_url",
            "head.repo.organization.email",
            "head.repo.organization.events_url",
            "head.repo.organization.followers_url",
            "head.repo.organization.following_url",
            "head.repo.organization.gists_url",
            "head.repo.organization.gravatar_id",
            "head.repo.organization.html_url",
            "head.repo.organization.id",
            "head.repo.organization.login",
            "head.repo.organization.name",
            "head.repo.organization.node_id",
            "head.repo.organization.organizations_url",
            "head.repo.organization.received_events_url",
            "head.repo.organization.repos_url",
            "head.repo.organization.site_admin",
            "head.repo.organization.starred_at",
            "head.repo.organization.starred_url",
            "head.repo.organization.subscriptions_url",
            "head.repo.organization.type",
            "head.repo.organization.url",
            "head.repo.owner.avatar_url",
            "head.repo.owner.email",
            "head.repo.owner.events_url",
            "head.repo.owner.followers_url",
            "head.repo.owner.following_url",
            "head.repo.owner.gists_url",
            "head.repo.owner.gravatar_id",
            "head.repo.owner.html_url",
            "head.repo.owner.id",
            "head.repo.owner.login",
            "head.repo.owner.name",
            "head.repo.owner.node_id",
            "head.repo.owner.organizations_url",
            "head.repo.owner.received_events_url",
            "head.repo.owner.repos_url",
            "head.repo.owner.site_admin",
            "head.repo.owner.starred_at",
            "head.repo.owner.starred_url",
            "head.repo.owner.subscriptions_url",
            "head.repo.owner.type",
            "head.repo.owner.url",
            "head.repo.permissions.admin",
            "head.repo.permissions.maintain",
            "head.repo.permissions.pull",
            "head.repo.permissions.push",
            "head.repo.permissions.triage",
            "head.repo.private",
            "head.repo.pulls_url",
            "head.repo.pushed_at",
            "head.repo.releases_url",
            "head.repo.size",
            "head.repo.squash_merge_commit_message",
            "head.repo.squash_merge_commit_title",
            "head.repo.ssh_url",
            "head.repo.stargazers_count",
            "head.repo.stargazers_url",
            "head.repo.starred_at",
            "head.repo.statuses_url",
            "head.repo.subscribers_count",
            "head.repo.subscribers_url",
            "head.repo.subscription_url",
            "head.repo.svn_url",
            "head.repo.tags_url",
            "head.repo.teams_url",
            "head.repo.temp_clone_token",
            "head.repo.template_repository.allow_auto_merge",
            "head.repo.template_repository.allow_merge_commit",
            "head.repo.template_repository.allow_rebase_merge",
            "head.repo.template_repository.allow_squash_merge",
            "head.repo.template_repository.allow_update_branch",
            "head.repo.template_repository.archive_url",
            "head.repo.template_repository.archived",
            "head.repo.template_repository.assignees_url",
            "head.repo.template_repository.blobs_url",
            "head.repo.template_repository.branches_url",
            "head.repo.template_repository.clone_url",
            "head.repo.template_repository.collaborators_url",
            "head.repo.template_repository.comments_url",
            "head.repo.template_repository.commits_url",
            "head.repo.template_repository.compare_url",
            "head.repo.template_repository.contents_url",
            "head.repo.template_repository.contributors_url",
            "head.repo.template_repository.created_at",
            "head.repo.template_repository.default_branch",
            "head.repo.template_repository.delete_branch_on_merge",
            "head.repo.template_repository.deployments_url",
            "head.repo.template_repository.description",
            "head.repo.template_repository.disabled",
            "head.repo.template_repository.downloads_url",
            "head.repo.template_repository.events_url",
            "head.repo.template_repository.fork",
            "head.repo.template_repository.forks_count",
            "head.repo.template_repository.forks_url",
            "head.repo.template_repository.full_name",
            "head.repo.template_repository.git_commits_url",
            "head.repo.template_repository.git_refs_url",
            "head.repo.template_repository.git_tags_url",
            "head.repo.template_repository.git_url",
            "head.repo.template_repository.has_downloads",
            "head.repo.template_repository.has_issues",
            "head.repo.template_repository.has_pages",
            "head.repo.template_repository.has_projects",
            "head.repo.template_repository.has_wiki",
            "head.repo.template_repository.homepage",
            "head.repo.template_repository.hooks_url",
            "head.repo.template_repository.html_url",
            "head.repo.template_repository.id",
            "head.repo.template_repository.is_template",
            "head.repo.template_repository.issue_comment_url",
            "head.repo.template_repository.issue_events_url",
            "head.repo.template_repository.issues_url",
            "head.repo.template_repository.keys_url",
            "head.repo.template_repository.labels_url",
            "head.repo.template_repository.language",
            "head.repo.template_repository.languages_url",
            "head.repo.template_repository.merge_commit_message",
            "head.repo.template_repository.merge_commit_title",
            "head.repo.template_repository.merges_url",
            "head.repo.template_repository.milestones_url",
            "head.repo.template_repository.mirror_url",
            "head.repo.template_repository.name",
            "head.repo.template_repository.network_count",
            "head.repo.template_repository.node_id",
            "head.repo.template_repository.notifications_url",
            "head.repo.template_repository.open_issues_count",
            "head.repo.template_repository.owner.avatar_url",
            "head.repo.template_repository.owner.events_url",
            "head.repo.template_repository.owner.followers_url",
            "head.repo.template_repository.owner.following_url",
            "head.repo.template_repository.owner.gists_url",
            "head.repo.template_repository.owner.gravatar_id",
            "head.repo.template_repository.owner.html_url",
            "head.repo.template_repository.owner.id",
            "head.repo.template_repository.owner.login",
            "head.repo.template_repository.owner.node_id",
            "head.repo.template_repository.owner.organizations_url",
            "head.repo.template_repository.owner.received_events_url",
            "head.repo.template_repository.owner.repos_url",
            "head.repo.template_repository.owner.site_admin",
            "head.repo.template_repository.owner.starred_url",
            "head.repo.template_repository.owner.subscriptions_url",
            "head.repo.template_repository.owner.type",
            "head.repo.template_repository.owner.url",
            "head.repo.template_repository.permissions.admin",
            "head.repo.template_repository.permissions.maintain",
            "head.repo.template_repository.permissions.pull",
            "head.repo.template_repository.permissions.push",
            "head.repo.template_repository.permissions.triage",
            "head.repo.template_repository.private",
            "head.repo.template_repository.pulls_url",
            "head.repo.template_repository.pushed_at",
            "head.repo.template_repository.releases_url",
            "head.repo.template_repository.size",
            "head.repo.template_repository.squash_merge_commit_message",
            "head.repo.template_repository.squash_merge_commit_title",
            "head.repo.template_repository.ssh_url",
            "head.repo.template_repository.stargazers_count",
            "head.repo.template_repository.stargazers_url",
            "head.repo.template_repository.statuses_url",
            "head.repo.template_repository.subscribers_count",
            "head.repo.template_repository.subscribers_url",
            "head.repo.template_repository.subscription_url",
            "head.repo.template_repository.svn_url",
            "head.repo.template_repository.tags_url",
            "head.repo.template_repository.teams_url",
            "head.repo.template_repository.temp_clone_token",
            "head.repo.template_repository.topics",
            "head.repo.template_repository.trees_url",
            "head.repo.template_repository.updated_at",
            "head.repo.template_repository.url",
            "head.repo.template_repository.use_squash_pr_title_as_default",
            "head.repo.template_repository.visibility",
            "head.repo.template_repository.watchers_count",
            "head.repo.topics",
            "head.repo.trees_url",
            "head.repo.updated_at",
            "head.repo.url",
            "head.repo.use_squash_pr_title_as_default",
            "head.repo.visibility",
            "head.repo.watchers",
            "head.repo.watchers_count",
            "head.repo.web_commit_signoff_required",
            "head.sha",
            "head.user.avatar_url",
            "head.user.email",
            "head.user.events_url",
            "head.user.followers_url",
            "head.user.following_url",
            "head.user.gists_url",
            "head.user.gravatar_id",
            "head.user.html_url",
            "head.user.id",
            "head.user.login",
            "head.user.name",
            "head.user.node_id",
            "head.user.organizations_url",
            "head.user.received_events_url",
            "head.user.repos_url",
            "head.user.site_admin",
            "head.user.starred_at",
            "head.user.starred_url",
            "head.user.subscriptions_url",
            "head.user.type",
            "head.user.url",
            "html_url",
            "id",
            "issue_url",
            "labels",
            "locked",
            "merge_commit_sha",
            "merged_at",
            "milestone.closed_at",
            "milestone.closed_issues",
            "milestone.created_at",
            "milestone.creator.avatar_url",
            "milestone.creator.email",
            "milestone.creator.events_url",
            "milestone.creator.followers_url",
            "milestone.creator.following_url",
            "milestone.creator.gists_url",
            "milestone.creator.gravatar_id",
            "milestone.creator.html_url",
            "milestone.creator.id",
            "milestone.creator.login",
            "milestone.creator.name",
            "milestone.creator.node_id",
            "milestone.creator.organizations_url",
            "milestone.creator.received_events_url",
            "milestone.creator.repos_url",
            "milestone.creator.site_admin",
            "milestone.creator.starred_at",
            "milestone.creator.starred_url",
            "milestone.creator.subscriptions_url",
            "milestone.creator.type",
            "milestone.creator.url",
            "milestone.description",
            "milestone.due_on",
            "milestone.html_url",
            "milestone.id",
            "milestone.labels_url",
            "milestone.node_id",
            "milestone.number",
            "milestone.open_issues",
            "milestone.state",
            "milestone.title",
            "milestone.updated_at",
            "milestone.url",
            "node_id",
            "number",
            "patch_url",
            "requested_reviewers",
            "requested_teams",
            "review_comment_url",
            "review_comments_url",
            "state",
            "statuses_url",
            "title",
            "updated_at",
            "url",
            "user.avatar_url",
            "user.email",
            "user.events_url",
            "user.followers_url",
            "user.following_url",
            "user.gists_url",
            "user.gravatar_id",
            "user.html_url",
            "user.id",
            "user.login",
            "user.name",
            "user.node_id",
            "user.organizations_url",
            "user.received_events_url",
            "user.repos_url",
            "user.site_admin",
            "user.starred_at",
            "user.starred_url",
            "user.subscriptions_url",
            "user.type",
            "user.url",
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
          getFakePull({
            number: 1,
            created_at: "1981-01-01T00:00:00Z",
            merged_at: "1981-01-01T12:00:00Z",
            head: { ref: "fix/FOO-01" },
          }),
        ],
        syncInfos: [
          getFakeSyncInfo({
            type: "pull",
            createdAt: new Date("1981-01-01T00:00:00Z").getTime(),
            updatedAt: new Date("1981-01-01T00:00:00Z").getTime(),
          }),
        ],
      },
      expectedFiles: [
        "github-pulls-data.csv",
        "pull-request-lead-times-daily.csv",
        "pull-request-lead-times-weekly.csv",
        "pull-request-lead-times-monthly.csv",
      ],
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
