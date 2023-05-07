import { z } from "zod"

export const githubActionRunSchema = z.object({
  id: z.number().int().describe("The ID of the workflow run."),
  name: z
    .union([
      z.string().describe("The name of the workflow run."),
      z.null().describe("The name of the workflow run."),
    ])
    .describe("The name of the workflow run.")
    .optional(),
  node_id: z.string(),
  check_suite_id: z
    .number()
    .int()
    .describe("The ID of the associated check suite.")
    .optional(),
  check_suite_node_id: z
    .string()
    .describe("The node ID of the associated check suite.")
    .optional(),
  head_branch: z.union([z.string(), z.null()]),
  head_sha: z
    .string()
    .describe(
      "The SHA of the head commit that points to the version of the workflow being run.",
    ),
  path: z.string().describe("The full path of the workflow"),
  run_number: z
    .number()
    .int()
    .describe("The auto incrementing run number for the workflow run."),
  run_attempt: z
    .number()
    .int()
    .describe(
      "Attempt number of the run, 1 for first attempt and higher if the workflow was re-run.",
    )
    .optional(),
  referenced_workflows: z
    .union([
      z.array(
        z
          .object({
            path: z.string(),
            sha: z.string(),
            ref: z.string().optional(),
          })
          .describe(
            "A workflow referenced/reused by the initial caller workflow",
          ),
      ),
      z.null(),
    ])
    .optional(),
  event: z.string(),
  status: z.union([z.string(), z.null()]),
  conclusion: z.union([z.string(), z.null()]),
  workflow_id: z
    .number()
    .int()
    .describe("The ID of the parent workflow."),
  url: z.string().describe("The URL to the workflow run."),
  html_url: z.string(),
  pull_requests: z.union([
    z.array(
      z.object({
        id: z.number().int(),
        number: z.number().int(),
        url: z.string(),
        head: z.object({
          ref: z.string(),
          sha: z.string(),
          repo: z.object({
            id: z.number().int(),
            url: z.string(),
            name: z.string(),
          }),
        }),
        base: z.object({
          ref: z.string(),
          sha: z.string(),
          repo: z.object({
            id: z.number().int(),
            url: z.string(),
            name: z.string(),
          }),
        }),
      }),
    ),
    z.null(),
  ]),
  created_at: z.string(),
  updated_at: z.string(),
  actor: z
    .object({
      name: z.union([z.string(), z.null()]).optional(),
      email: z.union([z.string(), z.null()]).optional(),
      login: z.string(),
      id: z.number().int(),
      node_id: z.string(),
      avatar_url: z.string().url(),
      gravatar_id: z.union([z.string(), z.null()]),
      url: z.string().url(),
      html_url: z.string().url(),
      followers_url: z.string().url(),
      following_url: z.string(),
      gists_url: z.string(),
      starred_url: z.string(),
      subscriptions_url: z.string().url(),
      organizations_url: z.string().url(),
      repos_url: z.string().url(),
      events_url: z.string(),
      received_events_url: z.string().url(),
      type: z.string(),
      site_admin: z.boolean(),
      starred_at: z.string().optional(),
    })
    .describe("A GitHub user.")
    .optional(),
  triggering_actor: z
    .object({
      name: z.union([z.string(), z.null()]).optional(),
      email: z.union([z.string(), z.null()]).optional(),
      login: z.string(),
      id: z.number().int(),
      node_id: z.string(),
      avatar_url: z.string().url(),
      gravatar_id: z.union([z.string(), z.null()]),
      url: z.string().url(),
      html_url: z.string().url(),
      followers_url: z.string().url(),
      following_url: z.string(),
      gists_url: z.string(),
      starred_url: z.string(),
      subscriptions_url: z.string().url(),
      organizations_url: z.string().url(),
      repos_url: z.string().url(),
      events_url: z.string(),
      received_events_url: z.string().url(),
      type: z.string(),
      site_admin: z.boolean(),
      starred_at: z.string().optional(),
    })
    .describe("A GitHub user.")
    .optional()
    .nullable(),
  run_started_at: z
    .string()
    .describe("The start time of the latest run. Resets on re-run.")
    .optional(),
  jobs_url: z
    .string()
    .describe("The URL to the jobs for the workflow run."),
  logs_url: z
    .string()
    .describe("The URL to download the logs for the workflow run."),
  check_suite_url: z
    .string()
    .describe("The URL to the associated check suite."),
  artifacts_url: z
    .string()
    .describe("The URL to the artifacts for the workflow run."),
  cancel_url: z.string().describe("The URL to cancel the workflow run."),
  rerun_url: z.string().describe("The URL to rerun the workflow run."),
  previous_attempt_url: z
    .union([
      z
        .string()
        .describe(
          "The URL to the previous attempted run of this workflow, if one exists.",
        ),
      z
        .null()
        .describe(
          "The URL to the previous attempted run of this workflow, if one exists.",
        ),
    ])
    .describe(
      "The URL to the previous attempted run of this workflow, if one exists.",
    )
    .optional(),
  workflow_url: z.string().describe("The URL to the workflow."),
  head_commit: z.union([
    z.null(),
    z
      .object({
        id: z.string(),
        tree_id: z.string(),
        message: z.string(),
        timestamp: z.string(),
        author: z.union([
          z.object({ name: z.string(), email: z.string() }),
          z.null(),
        ]),
        committer: z.union([
          z.object({ name: z.string(), email: z.string() }),
          z.null(),
        ]),
      })
      .describe("A commit."),
  ]),
  repository: z
    .object({
      id: z.number().int(),
      node_id: z.string(),
      name: z.string(),
      full_name: z.string(),
      owner: z
        .object({
          name: z.union([z.string(), z.null()]).optional(),
          email: z.union([z.string(), z.null()]).optional(),
          login: z.string(),
          id: z.number().int(),
          node_id: z.string(),
          avatar_url: z.string().url(),
          gravatar_id: z.union([z.string(), z.null()]),
          url: z.string().url(),
          html_url: z.string().url(),
          followers_url: z.string().url(),
          following_url: z.string(),
          gists_url: z.string(),
          starred_url: z.string(),
          subscriptions_url: z.string().url(),
          organizations_url: z.string().url(),
          repos_url: z.string().url(),
          events_url: z.string(),
          received_events_url: z.string().url(),
          type: z.string(),
          site_admin: z.boolean(),
          starred_at: z.string().optional(),
        })
        .describe("A GitHub user."),
      private: z.boolean(),
      html_url: z.string().url(),
      description: z.union([z.string(), z.null()]),
      fork: z.boolean(),
      url: z.string().url(),
      archive_url: z.string(),
      assignees_url: z.string(),
      blobs_url: z.string(),
      branches_url: z.string(),
      collaborators_url: z.string(),
      comments_url: z.string(),
      commits_url: z.string(),
      compare_url: z.string(),
      contents_url: z.string(),
      contributors_url: z.string().url(),
      deployments_url: z.string().url(),
      downloads_url: z.string().url(),
      events_url: z.string().url(),
      forks_url: z.string().url(),
      git_commits_url: z.string(),
      git_refs_url: z.string(),
      git_tags_url: z.string(),
      git_url: z.string().optional(),
      issue_comment_url: z.string(),
      issue_events_url: z.string(),
      issues_url: z.string(),
      keys_url: z.string(),
      labels_url: z.string(),
      languages_url: z.string().url(),
      merges_url: z.string().url(),
      milestones_url: z.string(),
      notifications_url: z.string(),
      pulls_url: z.string(),
      releases_url: z.string(),
      ssh_url: z.string().optional(),
      stargazers_url: z.string().url(),
      statuses_url: z.string(),
      subscribers_url: z.string().url(),
      subscription_url: z.string().url(),
      tags_url: z.string().url(),
      teams_url: z.string().url(),
      trees_url: z.string(),
      clone_url: z.string().optional(),
      mirror_url: z.union([z.string(), z.null()]).optional(),
      hooks_url: z.string().url(),
      svn_url: z.string().optional(),
      homepage: z.union([z.string(), z.null()]).optional(),
      language: z.union([z.string(), z.null()]).optional(),
      forks_count: z.number().int().optional(),
      stargazers_count: z.number().int().optional(),
      watchers_count: z.number().int().optional(),
      size: z
        .number()
        .int()
        .describe(
          "The size of the repository. Size is calculated hourly. When a repository is initially created, the size is 0.",
        )
        .optional(),
      default_branch: z.string().optional(),
      open_issues_count: z.number().int().optional(),
      is_template: z.boolean().optional(),
      topics: z.array(z.string()).optional(),
      has_issues: z.boolean().optional(),
      has_projects: z.boolean().optional(),
      has_wiki: z.boolean().optional(),
      has_pages: z.boolean().optional(),
      has_downloads: z.boolean().optional(),
      has_discussions: z.boolean().optional(),
      archived: z.boolean().optional(),
      disabled: z.boolean().optional(),
      visibility: z.string().optional(),
      pushed_at: z.union([z.string(), z.null()]).optional(),
      created_at: z.union([z.string(), z.null()]).optional(),
      updated_at: z.union([z.string(), z.null()]).optional(),
      permissions: z
        .object({
          admin: z.boolean().optional(),
          maintain: z.boolean().optional(),
          push: z.boolean().optional(),
          triage: z.boolean().optional(),
          pull: z.boolean().optional(),
        })
        .optional(),
      role_name: z.string().optional(),
      temp_clone_token: z.string().optional(),
      delete_branch_on_merge: z.boolean().optional(),
      subscribers_count: z.number().int().optional(),
      network_count: z.number().int().optional(),
      code_of_conduct: z
        .object({
          key: z.string(),
          name: z.string(),
          url: z.string().url(),
          body: z.string().optional(),
          html_url: z.union([z.string().url(), z.null()]),
        })
        .describe("Code Of Conduct")
        .optional(),
      license: z
        .union([
          z.object({
            key: z.string().optional(),
            name: z.string().optional(),
            spdx_id: z.string().optional(),
            url: z.string().optional(),
            node_id: z.string().optional(),
          }),
          z.null(),
        ])
        .optional(),
      forks: z.number().int().optional(),
      open_issues: z.number().int().optional(),
      watchers: z.number().int().optional(),
      allow_forking: z.boolean().optional(),
      web_commit_signoff_required: z.boolean().optional(),
    })
    .describe("Minimal Repository"),
  head_repository: z
    .object({
      id: z.number().int(),
      node_id: z.string(),
      name: z.string(),
      full_name: z.string(),
      owner: z
        .object({
          name: z.union([z.string(), z.null()]).optional(),
          email: z.union([z.string(), z.null()]).optional(),
          login: z.string(),
          id: z.number().int(),
          node_id: z.string(),
          avatar_url: z.string().url(),
          gravatar_id: z.union([z.string(), z.null()]),
          url: z.string().url(),
          html_url: z.string().url(),
          followers_url: z.string().url(),
          following_url: z.string(),
          gists_url: z.string(),
          starred_url: z.string(),
          subscriptions_url: z.string().url(),
          organizations_url: z.string().url(),
          repos_url: z.string().url(),
          events_url: z.string(),
          received_events_url: z.string().url(),
          type: z.string(),
          site_admin: z.boolean(),
          starred_at: z.string().optional(),
        })
        .describe("A GitHub user."),
      private: z.boolean(),
      html_url: z.string().url(),
      description: z.union([z.string(), z.null()]),
      fork: z.boolean(),
      url: z.string().url(),
      archive_url: z.string(),
      assignees_url: z.string(),
      blobs_url: z.string(),
      branches_url: z.string(),
      collaborators_url: z.string(),
      comments_url: z.string(),
      commits_url: z.string(),
      compare_url: z.string(),
      contents_url: z.string(),
      contributors_url: z.string().url(),
      deployments_url: z.string().url(),
      downloads_url: z.string().url(),
      events_url: z.string().url(),
      forks_url: z.string().url(),
      git_commits_url: z.string(),
      git_refs_url: z.string(),
      git_tags_url: z.string(),
      git_url: z.string().optional(),
      issue_comment_url: z.string(),
      issue_events_url: z.string(),
      issues_url: z.string(),
      keys_url: z.string(),
      labels_url: z.string(),
      languages_url: z.string().url(),
      merges_url: z.string().url(),
      milestones_url: z.string(),
      notifications_url: z.string(),
      pulls_url: z.string(),
      releases_url: z.string(),
      ssh_url: z.string().optional(),
      stargazers_url: z.string().url(),
      statuses_url: z.string(),
      subscribers_url: z.string().url(),
      subscription_url: z.string().url(),
      tags_url: z.string().url(),
      teams_url: z.string().url(),
      trees_url: z.string(),
      clone_url: z.string().optional(),
      mirror_url: z.union([z.string(), z.null()]).optional(),
      hooks_url: z.string().url(),
      svn_url: z.string().optional(),
      homepage: z.union([z.string(), z.null()]).optional(),
      language: z.union([z.string(), z.null()]).optional(),
      forks_count: z.number().int().optional(),
      stargazers_count: z.number().int().optional(),
      watchers_count: z.number().int().optional(),
      size: z
        .number()
        .int()
        .describe(
          "The size of the repository. Size is calculated hourly. When a repository is initially created, the size is 0.",
        )
        .optional(),
      default_branch: z.string().optional(),
      open_issues_count: z.number().int().optional(),
      is_template: z.boolean().optional(),
      topics: z.array(z.string()).optional(),
      has_issues: z.boolean().optional(),
      has_projects: z.boolean().optional(),
      has_wiki: z.boolean().optional(),
      has_pages: z.boolean().optional(),
      has_downloads: z.boolean().optional(),
      has_discussions: z.boolean().optional(),
      archived: z.boolean().optional(),
      disabled: z.boolean().optional(),
      visibility: z.string().optional(),
      pushed_at: z.union([z.string(), z.null()]).optional(),
      created_at: z.union([z.string(), z.null()]).optional(),
      updated_at: z.union([z.string(), z.null()]).optional(),
      permissions: z
        .object({
          admin: z.boolean().optional(),
          maintain: z.boolean().optional(),
          push: z.boolean().optional(),
          triage: z.boolean().optional(),
          pull: z.boolean().optional(),
        })
        .optional(),
      role_name: z.string().optional(),
      temp_clone_token: z.string().optional(),
      delete_branch_on_merge: z.boolean().optional(),
      subscribers_count: z.number().int().optional(),
      network_count: z.number().int().optional(),
      code_of_conduct: z
        .object({
          key: z.string(),
          name: z.string(),
          url: z.string().url(),
          body: z.string().optional(),
          html_url: z.union([z.string().url(), z.null()]),
        })
        .describe("Code Of Conduct")
        .optional(),
      license: z
        .union([
          z.object({
            key: z.string().optional(),
            name: z.string().optional(),
            spdx_id: z.string().optional(),
            url: z.string().optional(),
            node_id: z.string().optional(),
          }),
          z.null(),
        ])
        .optional(),
      forks: z.number().int().optional(),
      open_issues: z.number().int().optional(),
      watchers: z.number().int().optional(),
      allow_forking: z.boolean().optional(),
      web_commit_signoff_required: z.boolean().optional(),
    })
    .describe("Minimal Repository"),
  head_repository_id: z.number().int().optional(),
  display_title: z
    .string()
    .describe(
      "The event-specific title associated with the run or the run-name if set, or the value of `run-name` if it is set in the workflow.",
    ),
})

export type GithubActionRun = z.infer<typeof githubActionRunSchema>
