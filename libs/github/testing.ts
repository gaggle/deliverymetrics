import { deepMerge } from "std:deep-merge"

import { MockAloeDatabase } from "../db/mod.ts"

import { DeepPartial } from "../types.ts"

import { AloeGithubClient, ReadonlyAloeGithubClient } from "./clients/aloe-github-client.ts"
import {
  ActionRun,
  actionRunSchema,
  ActionWorkflow,
  actionWorkflowSchema,
  BoundGithubPullCommit,
  boundGithubPullCommit,
  GithubClient,
  GithubCommit,
  githubCommitSchema,
  GithubPull,
  GithubPullCommit,
  githubPullSchema,
  ReadonlyGithubClient,
  SyncInfo,
  syncInfoSchema,
} from "./types/mod.ts"

export function getFakeCommit(partial: DeepPartial<GithubCommit> = {}): GithubCommit {
  const base: GithubCommit = {
    url: "https://api.github.com/repos/octocat/Hello-World/commits/6dcb09b5b57875f334f61aebed695e2e4193db5e",
    sha: "6dcb09b5b57875f334f61aebed695e2e4193db5e",
    node_id: "MDY6Q29tbWl0NmRjYjA5YjViNTc4NzVmMzM0ZjYxYWViZWQ2OTVlMmU0MTkzZGI1ZQ==",
    html_url: "https://github.com/octocat/Hello-World/commit/6dcb09b5b57875f334f61aebed695e2e4193db5e",
    comments_url:
      "https://api.github.com/repos/octocat/Hello-World/commits/6dcb09b5b57875f334f61aebed695e2e4193db5e/comments",
    commit: {
      url: "https://api.github.com/repos/octocat/Hello-World/git/commits/6dcb09b5b57875f334f61aebed695e2e4193db5e",
      author: {
        name: "Monalisa Octocat",
        email: "support@github.com",
        date: "2011-04-14T16:00:49Z",
      },
      committer: {
        name: "Monalisa Octocat",
        email: "support@github.com",
        date: "2011-04-14T16:00:49Z",
      },
      message: "Fix all the bugs",
      tree: {
        url: "https://api.github.com/repos/octocat/Hello-World/tree/6dcb09b5b57875f334f61aebed695e2e4193db5e",
        sha: "6dcb09b5b57875f334f61aebed695e2e4193db5e",
      },
      comment_count: 0,
      verification: {
        verified: false,
        reason: "unsigned",
        signature: null,
        payload: null,
      },
    },
    author: {
      login: "octocat",
      id: 1,
      node_id: "MDQ6VXNlcjE=",
      avatar_url: "https://github.com/images/error/octocat_happy.gif",
      gravatar_id: "",
      url: "https://api.github.com/users/octocat",
      html_url: "https://github.com/octocat",
      followers_url: "https://api.github.com/users/octocat/followers",
      following_url: "https://api.github.com/users/octocat/following{/other_user}",
      gists_url: "https://api.github.com/users/octocat/gists{/gist_id}",
      starred_url: "https://api.github.com/users/octocat/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/octocat/subscriptions",
      organizations_url: "https://api.github.com/users/octocat/orgs",
      repos_url: "https://api.github.com/users/octocat/repos",
      events_url: "https://api.github.com/users/octocat/events{/privacy}",
      received_events_url: "https://api.github.com/users/octocat/received_events",
      type: "User",
      site_admin: false,
    },
    committer: {
      login: "octocat",
      id: 1,
      node_id: "MDQ6VXNlcjE=",
      avatar_url: "https://github.com/images/error/octocat_happy.gif",
      gravatar_id: "",
      url: "https://api.github.com/users/octocat",
      html_url: "https://github.com/octocat",
      followers_url: "https://api.github.com/users/octocat/followers",
      following_url: "https://api.github.com/users/octocat/following{/other_user}",
      gists_url: "https://api.github.com/users/octocat/gists{/gist_id}",
      starred_url: "https://api.github.com/users/octocat/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/octocat/subscriptions",
      organizations_url: "https://api.github.com/users/octocat/orgs",
      repos_url: "https://api.github.com/users/octocat/repos",
      events_url: "https://api.github.com/users/octocat/events{/privacy}",
      received_events_url: "https://api.github.com/users/octocat/received_events",
      type: "User",
      site_admin: false,
    },
    parents: [
      {
        url: "https://api.github.com/repos/octocat/Hello-World/commits/6dcb09b5b57875f334f61aebed695e2e4193db5e",
        sha: "6dcb09b5b57875f334f61aebed695e2e4193db5e",
      },
    ],
  }
  return deepMerge(base, partial as GithubCommit)
}

export function getFakePullCommit(partial?: DeepPartial<GithubPullCommit>): GithubPullCommit
export function getFakePullCommit(partial?: DeepPartial<BoundGithubPullCommit>): BoundGithubPullCommit
export function getFakePullCommit(
  partial: DeepPartial<GithubPullCommit | BoundGithubPullCommit> = {},
): GithubPullCommit | BoundGithubPullCommit {
  const base: GithubPullCommit = {
    sha: "ab1c2d3ef45g6h7ijkl8m90n1op23q4r567st8u9",
    node_id: "A_bcDEFGtYwNoAKGU0Yzk4YjIyNTEzMjk3ZjgzYjNmMWYxNzU1MGIyMDBlNzU0YTc2OTc",
    commit: {
      author: {
        name: "author",
        email: "author@example.com",
        date: "1980-02-26T00:00:00Z",
      },
      committer: {
        name: "committer",
        email: "committer@example.com",
        date: "2000-01-01T00:00:00Z",
      },
      message: "commit message",
      tree: {
        sha: "ab1c2d3ef45g6h7ijkl8m90n1op23q4r567st8u9",
        url: "https://api.github.com/repos/owner/repo/git/trees/ab1c2d3ef45g6h7ijkl8m90n1op23q4r567st8u9",
      },
      url: "https://api.github.com/repos/owner/repo/git/commits/ab1c2d3ef45g6h7ijkl8m90n1op23q4r567st8u9",
      comment_count: 0,
      verification: {
        verified: false,
        reason: "unsigned",
        signature: null,
        payload: null,
      },
    },
    url: "https://api.github.com/repos/owner/repo/commits/ab1c2d3ef45g6h7ijkl8m90n1op23q4r567st8u9",
    html_url: "https://github.com/owner/repo/commit/ab1c2d3ef45g6h7ijkl8m90n1op23q4r567st8u9",
    comments_url: "https://api.github.com/repos/owner/repo/commits/ab1c2d3ef45g6h7ijkl8m90n1op23q4r567st8u9/comments",
    author: {
      login: "owner",
      id: 1234567,
      node_id: "ABCdOk9yZ2FuaXphdGlvbjQ1MzAxNjQ=",
      avatar_url: "https://avatars.githubusercontent.com/u/1234567?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/owner",
      html_url: "https://github.com/owner",
      followers_url: "https://api.github.com/users/owner/followers",
      following_url: "https://api.github.com/users/owner/following{/other_user}",
      gists_url: "https://api.github.com/users/owner/gists{/gist_id}",
      starred_url: "https://api.github.com/users/owner/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/owner/subscriptions",
      organizations_url: "https://api.github.com/users/owner/orgs",
      repos_url: "https://api.github.com/users/owner/repos",
      events_url: "https://api.github.com/users/owner/events{/privacy}",
      received_events_url: "https://api.github.com/users/owner/received_events",
      type: "User",
      site_admin: false,
    },
    committer: {
      login: "owner",
      id: 1234567,
      node_id: "ABCdOk9yZ2FuaXphdGlvbjQ1MzAxNjQ=",
      avatar_url: "https://avatars.githubusercontent.com/u/1234567?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/owner",
      html_url: "https://github.com/owner",
      followers_url: "https://api.github.com/users/owner/followers",
      following_url: "https://api.github.com/users/owner/following{/other_user}",
      gists_url: "https://api.github.com/users/owner/gists{/gist_id}",
      starred_url: "https://api.github.com/users/owner/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/owner/subscriptions",
      organizations_url: "https://api.github.com/users/owner/orgs",
      repos_url: "https://api.github.com/users/owner/repos",
      events_url: "https://api.github.com/users/owner/events{/privacy}",
      received_events_url: "https://api.github.com/users/owner/received_events",
      type: "User",
      site_admin: false,
    },
    parents: [
      {
        sha: "2fd4e1c67a2d28fced849ee1bb76e7391b93eb12",
        url: "https://api.github.com/repos/owner/repo/commits/2fd4e1c67a2d28fced849ee1bb76e7391b93eb12",
        html_url: "https://github.com/owner/repo/commit/2fd4e1c67a2d28fced849ee1bb76e7391b93eb12",
      },
    ],
  }
  return deepMerge(base, partial as GithubPullCommit | BoundGithubPullCommit)
}

export function getFakePull(partial: DeepPartial<GithubPull> = {}): GithubPull {
  const repo: GithubPull["base"]["repo"] = {
    id: 123456789,
    name: "repo",
    full_name: "owner/repo",
    private: true,
    html_url: "https://github.com/owner/repo",
    description: "description",
    fork: false,
    url: "https://api.github.com/repos/owner/repo",
    forks_url: "https://api.github.com/repos/owner/repo/forks",
    keys_url: "https://api.github.com/repos/owner/repo/keys{/key_id}",
    collaborators_url: "https://api.github.com/repos/owner/repo/collaborators{/collaborator}",
    teams_url: "https://api.github.com/repos/owner/repo/teams",
    hooks_url: "https://api.github.com/repos/owner/repo/hooks",
    issue_events_url: "https://api.github.com/repos/owner/repo/issues/events{/number}",
    events_url: "https://api.github.com/repos/owner/repo/events",
    assignees_url: "https://api.github.com/repos/owner/repo/assignees{/user}",
    branches_url: "https://api.github.com/repos/owner/repo/branches{/branch}",
    tags_url: "https://api.github.com/repos/owner/repo/tags",
    blobs_url: "https://api.github.com/repos/owner/repo/git/blobs{/sha}",
    git_tags_url: "https://api.github.com/repos/owner/repo/git/tags{/sha}",
    git_refs_url: "https://api.github.com/repos/owner/repo/git/refs{/sha}",
    trees_url: "https://api.github.com/repos/owner/repo/git/trees{/sha}",
    statuses_url: "https://api.github.com/repos/owner/repo/statuses/{sha}",
    languages_url: "https://api.github.com/repos/owner/repo/languages",
    stargazers_url: "https://api.github.com/repos/owner/repo/stargazers",
    contributors_url: "https://api.github.com/repos/owner/repo/contributors",
    subscribers_url: "https://api.github.com/repos/owner/repo/subscribers",
    subscription_url: "https://api.github.com/repos/owner/repo/subscription",
    commits_url: "https://api.github.com/repos/owner/repo/commits{/sha}",
    git_commits_url: "https://api.github.com/repos/owner/repo/git/commits{/sha}",
    comments_url: "https://api.github.com/repos/owner/repo/comments{/number}",
    issue_comment_url: "https://api.github.com/repos/owner/repo/issues/comments{/number}",
    contents_url: "https://api.github.com/repos/owner/repo/contents/{+path}",
    compare_url: "https://api.github.com/repos/owner/repo/compare/{base}...{head}",
    merges_url: "https://api.github.com/repos/owner/repo/merges",
    archive_url: "https://api.github.com/repos/owner/repo/{archive_format}{/ref}",
    downloads_url: "https://api.github.com/repos/owner/repo/downloads",
    issues_url: "https://api.github.com/repos/owner/repo/issues{/number}",
    pulls_url: "https://api.github.com/repos/owner/repo/pulls{/number}",
    milestones_url: "https://api.github.com/repos/owner/repo/milestones{/number}",
    notifications_url: "https://api.github.com/repos/owner/repo/notifications{?since,all,participating}",
    labels_url: "https://api.github.com/repos/owner/repo/labels{/name}",
    releases_url: "https://api.github.com/repos/owner/repo/releases{/id}",
    deployments_url: "https://api.github.com/repos/owner/repo/deployments",
    created_at: "1999-01-01T00:00:00Z",
    updated_at: "2021-01-01T00:00:00Z",
    pushed_at: partial.updated_at || partial.created_at ||
      "2022-11-11T19:33:24Z",
    git_url: "git://github.com/owner/repo.git",
    ssh_url: "git@github.com:owner/repo.git",
    clone_url: "https://github.com/owner/repo.git",
    svn_url: "https://github.com/owner/repo",
    homepage: "",
    size: 9999,
    stargazers_count: 6,
    watchers_count: 6,
    language: "TypeScript",
    has_issues: true,
    has_projects: true,
    has_downloads: true,
    has_wiki: true,
    has_pages: false,
    has_discussions: true,
    forks_count: 0,
    mirror_url: null,
    archived: false,
    disabled: false,
    open_issues_count: 25,
    license: null,
    allow_forking: false,
    is_template: false,
    web_commit_signoff_required: false,
    topics: [
      "topic",
    ],
    visibility: "internal",
    forks: 0,
    open_issues: 1,
    watchers: 99,
    default_branch: "main",
  }
  const base: GithubPull = {
    url: "https://url",
    id: partial.number || 1,
    node_id: "node_id",
    html_url: "https://url",
    number: 1,
    state: "open",
    locked: false,
    title: "title",
    body: null,
    created_at: partial.updated_at || "2022-01-01T00:00:00Z",
    updated_at: partial.created_at || "2022-01-01T05:00:00Z",
    closed_at: null,
    merged_at: null,
    merge_commit_sha: "2fd4e1c67a2d28fced849ee1bb76e7391b93eb12",
    labels: [],
    commits_url: `https://api.github.com/repos/owner/repo/pulls/${partial.number || 1}/commits`,
    review_comments_url: `https://api.github.com/repos/owner/repo/pulls/${partial.number || 1}/comments`,
    review_comment_url: "https://api.github.com/repos/owner/repo/pulls/comments{/number}",
    comments_url: `https://api.github.com/repos/owner/repo/issues/${partial.number || 1}/comments`,
    statuses_url: "https://api.github.com/repos/owner/repo/statuses/da39a3ee5e6b4b0d3255bfef95601890afd80709",
    draft: false,
    head: {
      label: "owner:fix/FOO-01",
      ref: "fix/FOO-01",
      sha: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
      user: {
        login: "owner",
        id: 1234567,
        node_id: "ABCdOk9yZ2FuaXphdGlvbjQ1MzAxNjQ=",
        avatar_url: "https://avatars.githubusercontent.com/u/1234567?v=4",
        gravatar_id: "",
        url: "https://api.github.com/users/owner",
        html_url: "https://github.com/owner",
        followers_url: "https://api.github.com/users/owner/followers",
        following_url: "https://api.github.com/users/owner/following{/other_user}",
        gists_url: "https://api.github.com/users/owner/gists{/gist_id}",
        starred_url: "https://api.github.com/users/owner/starred{/owner}{/repo}",
        subscriptions_url: "https://api.github.com/users/owner/subscriptions",
        organizations_url: "https://api.github.com/users/owner/orgs",
        repos_url: "https://api.github.com/users/owner/repos",
        events_url: "https://api.github.com/users/owner/events{/privacy}",
        received_events_url: "https://api.github.com/users/owner/received_events",
        type: "Organization",
        site_admin: false,
      },
      repo,
    },
    base: {
      label: "Foo:main",
      ref: "main",
      sha: "ab1c2d3ef45g6h7ijkl8m90n1op23q4r567st8u9",
      repo,
    },
    _links: {
      html: { href: "https://url" },
      self: { href: "https://url" },
      commits: {
        href: `https://api.github.com/repos/owner/repo/pulls/${partial.number || 1}/commits`,
      },
      statuses: {
        href: "https://api.github.com/repos/owner/repo/statuses/da39a3ee5e6b4b0d3255bfef95601890afd80709",
      },
    },
  }
  return deepMerge(base, partial as GithubPull)
}

export function getFakeSyncInfo(partial: DeepPartial<SyncInfo> = {}): SyncInfo {
  const base: SyncInfo = {
    createdAt: partial.updatedAt ? partial.updatedAt - 1 : new Date("2000-01-01T00:00:00Z").getTime(),
    updatedAt: partial.createdAt ? partial.createdAt + 1 : new Date("2000-01-01T00:01:00Z").getTime(),
  }
  return deepMerge(base, partial as SyncInfo)
}

export function getFakeActionWorkflow(partial: DeepPartial<ActionWorkflow> = {}): ActionWorkflow {
  const base: ActionWorkflow = {
    "id": 161335,
    "node_id": "MDg6V29ya2Zsb3cxNjEzMzU=",
    "name": "CI",
    "path": ".github/workflows/blank.yaml",
    "state": "active",
    "created_at": "2020-01-08T23:48:37.000-08:00",
    "updated_at": "2020-01-08T23:50:21.000-08:00",
    "url": "https://api.github.com/repos/octo-org/octo-repo/actions/workflows/161335",
    "html_url": "https://github.com/octo-org/octo-repo/blob/master/.github/workflows/161335",
    "badge_url": "https://github.com/octo-org/octo-repo/workflows/CI/badge.svg",
  }
  return deepMerge(base, partial as ActionWorkflow)
}

export function getFakeActionRun(partial: DeepPartial<ActionRun> = {}): ActionRun {
  const base: ActionRun = {
    "id": 3648870083,
    "name": "Name",
    "node_id": "ABC_deFOGOtYwM7ZfVbD",
    "head_branch": "main",
    "head_sha": "ab1c2d3ef45g6h7ijkl8m90n1op23q4r567st8u9",
    "path": ".github/workflows/name.yml",
    "display_title": "display_title…",
    "run_number": 123,
    "event": "push",
    "status": "completed",
    "conclusion": "success",
    "workflow_id": 23456789,
    "check_suite_id": 3456789012,
    "check_suite_node_id": "AB_cdEFGHiYwM8AAAACRQvXSA",
    "url": "https://api.github.com/repos/owner/repo/actions/runs/3648870083",
    "html_url": "https://github.com/owner/repo/actions/runs/3648870083",
    "pull_requests": [],
    "created_at": "2022-12-08T13:48:03Z",
    "updated_at": "2022-12-08T14:21:37Z",
    "actor": {
      "login": "author-name",
      "id": 98765432,
      "node_id": "A_bcDEFgHiJk",
      "avatar_url": "https://avatars.githubusercontent.com/u/98765432?v=4",
      "gravatar_id": "",
      "url": "https://api.github.com/users/author-name",
      "html_url": "https://github.com/author-name",
      "followers_url": "https://api.github.com/users/author-name/followers",
      "following_url": "https://api.github.com/users/author-name/following{/other_user}",
      "gists_url": "https://api.github.com/users/author-name/gists{/gist_id}",
      "starred_url": "https://api.github.com/users/author-name/starred{/owner}{/repo}",
      "subscriptions_url": "https://api.github.com/users/author-name/subscriptions",
      "organizations_url": "https://api.github.com/users/author-name/orgs",
      "repos_url": "https://api.github.com/users/author-name/repos",
      "events_url": "https://api.github.com/users/author-name/events{/privacy}",
      "received_events_url": "https://api.github.com/users/author-name/received_events",
      "type": "User",
      "site_admin": false,
    },
    "run_attempt": 1,
    "referenced_workflows": [
      {
        "path": "owner/repo/.github/workflows/foo.yml@ab1c2d3ef45g6h7ijkl8m90n1op23q4r567st8u9",
        "sha": "ab1c2d3ef45g6h7ijkl8m90n1op23q4r567st8u9",
        "ref": "refs/heads/main",
      },
      {
        "path": "owner/repo/.github/workflows/bar.yml@ab1c2d3ef45g6h7ijkl8m90n1op23q4r567st8u9",
        "sha": "ab1c2d3ef45g6h7ijkl8m90n1op23q4r567st8u9",
        "ref": "refs/heads/main",
      },
      {
        "path": "owner/repo/.github/workflows/baz.yml@ab1c2d3ef45g6h7ijkl8m90n1op23q4r567st8u9",
        "sha": "ab1c2d3ef45g6h7ijkl8m90n1op23q4r567st8u9",
        "ref": "refs/heads/main",
      },
    ],
    "run_started_at": "2022-12-08T13:48:03Z",
    "triggering_actor": {
      "login": "author-name",
      "id": 98765432,
      "node_id": "A_bcDEFgHiJk",
      "avatar_url": "https://avatars.githubusercontent.com/u/98765432?v=4",
      "gravatar_id": "",
      "url": "https://api.github.com/users/author-name",
      "html_url": "https://github.com/author-name",
      "followers_url": "https://api.github.com/users/author-name/followers",
      "following_url": "https://api.github.com/users/author-name/following{/other_user}",
      "gists_url": "https://api.github.com/users/author-name/gists{/gist_id}",
      "starred_url": "https://api.github.com/users/author-name/starred{/owner}{/repo}",
      "subscriptions_url": "https://api.github.com/users/author-name/subscriptions",
      "organizations_url": "https://api.github.com/users/author-name/orgs",
      "repos_url": "https://api.github.com/users/author-name/repos",
      "events_url": "https://api.github.com/users/author-name/events{/privacy}",
      "received_events_url": "https://api.github.com/users/author-name/received_events",
      "type": "User",
      "site_admin": false,
    },
    "jobs_url": "https://api.github.com/repos/owner/repo/actions/runs/3648870083/jobs",
    "logs_url": "https://api.github.com/repos/owner/repo/actions/runs/3648870083/logs",
    "check_suite_url": "https://api.github.com/repos/owner/repo/check-suites/3456789012",
    "artifacts_url": "https://api.github.com/repos/owner/repo/actions/runs/3648870083/artifacts",
    "cancel_url": "https://api.github.com/repos/owner/repo/actions/runs/3648870083/cancel",
    "rerun_url": "https://api.github.com/repos/owner/repo/actions/runs/3648870083/rerun",
    "previous_attempt_url": null,
    "workflow_url": "https://api.github.com/repos/owner/repo/actions/workflows/23456789",
    "head_commit": {
      "id": "ab1c2d3ef45g6h7ijkl8m90n1op23q4r567st8u9",
      "tree_id": "02d8dd5e2c98bc268a1c64014a9f289a8b4a1a99",
      "message": "message",
      "timestamp": "2022-12-08T13:47:59Z",
      "author": {
        "name": "author-name",
        "email": "98765432+author-name@users.noreply.github.com",
      },
      "committer": {
        "name": "GitHub",
        "email": "noreply@github.com",
      },
    },
    "repository": {
      "id": 123456789,
      "node_id": "A_bcDEFGhYwA",
      "name": "repo",
      "full_name": "owner/repo",
      "private": true,
      "owner": {
        "login": "owner",
        "id": 1234567,
        "node_id": "ABCdEf1kL2MnuPqhdGlvbjQ1MzAxNjQ=",
        "avatar_url": "https://avatars.githubusercontent.com/u/1234567?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/owner",
        "html_url": "https://github.com/owner",
        "followers_url": "https://api.github.com/users/owner/followers",
        "following_url": "https://api.github.com/users/owner/following{/other_user}",
        "gists_url": "https://api.github.com/users/owner/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/owner/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/owner/subscriptions",
        "organizations_url": "https://api.github.com/users/owner/orgs",
        "repos_url": "https://api.github.com/users/owner/repos",
        "events_url": "https://api.github.com/users/owner/events{/privacy}",
        "received_events_url": "https://api.github.com/users/owner/received_events",
        "type": "Organization",
        "site_admin": false,
      },
      "html_url": "https://github.com/owner/repo",
      "description": "description",
      "fork": false,
      "url": "https://api.github.com/repos/owner/repo",
      "forks_url": "https://api.github.com/repos/owner/repo/forks",
      "keys_url": "https://api.github.com/repos/owner/repo/keys{/key_id}",
      "collaborators_url": "https://api.github.com/repos/owner/repo/collaborators{/collaborator}",
      "teams_url": "https://api.github.com/repos/owner/repo/teams",
      "hooks_url": "https://api.github.com/repos/owner/repo/hooks",
      "issue_events_url": "https://api.github.com/repos/owner/repo/issues/events{/number}",
      "events_url": "https://api.github.com/repos/owner/repo/events",
      "assignees_url": "https://api.github.com/repos/owner/repo/assignees{/user}",
      "branches_url": "https://api.github.com/repos/owner/repo/branches{/branch}",
      "tags_url": "https://api.github.com/repos/owner/repo/tags",
      "blobs_url": "https://api.github.com/repos/owner/repo/git/blobs{/sha}",
      "git_tags_url": "https://api.github.com/repos/owner/repo/git/tags{/sha}",
      "git_refs_url": "https://api.github.com/repos/owner/repo/git/refs{/sha}",
      "trees_url": "https://api.github.com/repos/owner/repo/git/trees{/sha}",
      "statuses_url": "https://api.github.com/repos/owner/repo/statuses/{sha}",
      "languages_url": "https://api.github.com/repos/owner/repo/languages",
      "stargazers_url": "https://api.github.com/repos/owner/repo/stargazers",
      "contributors_url": "https://api.github.com/repos/owner/repo/contributors",
      "subscribers_url": "https://api.github.com/repos/owner/repo/subscribers",
      "subscription_url": "https://api.github.com/repos/owner/repo/subscription",
      "commits_url": "https://api.github.com/repos/owner/repo/commits{/sha}",
      "git_commits_url": "https://api.github.com/repos/owner/repo/git/commits{/sha}",
      "comments_url": "https://api.github.com/repos/owner/repo/comments{/number}",
      "issue_comment_url": "https://api.github.com/repos/owner/repo/issues/comments{/number}",
      "contents_url": "https://api.github.com/repos/owner/repo/contents/{+path}",
      "compare_url": "https://api.github.com/repos/owner/repo/compare/{base}...{head}",
      "merges_url": "https://api.github.com/repos/owner/repo/merges",
      "archive_url": "https://api.github.com/repos/owner/repo/{archive_format}{/ref}",
      "downloads_url": "https://api.github.com/repos/owner/repo/downloads",
      "issues_url": "https://api.github.com/repos/owner/repo/issues{/number}",
      "pulls_url": "https://api.github.com/repos/owner/repo/pulls{/number}",
      "milestones_url": "https://api.github.com/repos/owner/repo/milestones{/number}",
      "notifications_url": "https://api.github.com/repos/owner/repo/notifications{?since,all,participating}",
      "labels_url": "https://api.github.com/repos/owner/repo/labels{/name}",
      "releases_url": "https://api.github.com/repos/owner/repo/releases{/id}",
      "deployments_url": "https://api.github.com/repos/owner/repo/deployments",
    },
    "head_repository": {
      "id": 123456789,
      "node_id": "A_bcDEFGhYwA",
      "name": "repo",
      "full_name": "owner/repo",
      "private": true,
      "owner": {
        "login": "owner",
        "id": 1234567,
        "node_id": "ABCdEf1kL2MnuPqhdGlvbjQ1MzAxNjQ=",
        "avatar_url": "https://avatars.githubusercontent.com/u/1234567?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/owner",
        "html_url": "https://github.com/owner",
        "followers_url": "https://api.github.com/users/owner/followers",
        "following_url": "https://api.github.com/users/owner/following{/other_user}",
        "gists_url": "https://api.github.com/users/owner/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/owner/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/owner/subscriptions",
        "organizations_url": "https://api.github.com/users/owner/orgs",
        "repos_url": "https://api.github.com/users/owner/repos",
        "events_url": "https://api.github.com/users/owner/events{/privacy}",
        "received_events_url": "https://api.github.com/users/owner/received_events",
        "type": "Organization",
        "site_admin": false,
      },
      "html_url": "https://github.com/owner/repo",
      "description": "description",
      "fork": false,
      "url": "https://api.github.com/repos/owner/repo",
      "forks_url": "https://api.github.com/repos/owner/repo/forks",
      "keys_url": "https://api.github.com/repos/owner/repo/keys{/key_id}",
      "collaborators_url": "https://api.github.com/repos/owner/repo/collaborators{/collaborator}",
      "teams_url": "https://api.github.com/repos/owner/repo/teams",
      "hooks_url": "https://api.github.com/repos/owner/repo/hooks",
      "issue_events_url": "https://api.github.com/repos/owner/repo/issues/events{/number}",
      "events_url": "https://api.github.com/repos/owner/repo/events",
      "assignees_url": "https://api.github.com/repos/owner/repo/assignees{/user}",
      "branches_url": "https://api.github.com/repos/owner/repo/branches{/branch}",
      "tags_url": "https://api.github.com/repos/owner/repo/tags",
      "blobs_url": "https://api.github.com/repos/owner/repo/git/blobs{/sha}",
      "git_tags_url": "https://api.github.com/repos/owner/repo/git/tags{/sha}",
      "git_refs_url": "https://api.github.com/repos/owner/repo/git/refs{/sha}",
      "trees_url": "https://api.github.com/repos/owner/repo/git/trees{/sha}",
      "statuses_url": "https://api.github.com/repos/owner/repo/statuses/{sha}",
      "languages_url": "https://api.github.com/repos/owner/repo/languages",
      "stargazers_url": "https://api.github.com/repos/owner/repo/stargazers",
      "contributors_url": "https://api.github.com/repos/owner/repo/contributors",
      "subscribers_url": "https://api.github.com/repos/owner/repo/subscribers",
      "subscription_url": "https://api.github.com/repos/owner/repo/subscription",
      "commits_url": "https://api.github.com/repos/owner/repo/commits{/sha}",
      "git_commits_url": "https://api.github.com/repos/owner/repo/git/commits{/sha}",
      "comments_url": "https://api.github.com/repos/owner/repo/comments{/number}",
      "issue_comment_url": "https://api.github.com/repos/owner/repo/issues/comments{/number}",
      "contents_url": "https://api.github.com/repos/owner/repo/contents/{+path}",
      "compare_url": "https://api.github.com/repos/owner/repo/compare/{base}...{head}",
      "merges_url": "https://api.github.com/repos/owner/repo/merges",
      "archive_url": "https://api.github.com/repos/owner/repo/{archive_format}{/ref}",
      "downloads_url": "https://api.github.com/repos/owner/repo/downloads",
      "issues_url": "https://api.github.com/repos/owner/repo/issues{/number}",
      "pulls_url": "https://api.github.com/repos/owner/repo/pulls{/number}",
      "milestones_url": "https://api.github.com/repos/owner/repo/milestones{/number}",
      "notifications_url": "https://api.github.com/repos/owner/repo/notifications{?since,all,participating}",
      "labels_url": "https://api.github.com/repos/owner/repo/labels{/name}",
      "releases_url": "https://api.github.com/repos/owner/repo/releases{/id}",
      "deployments_url": "https://api.github.com/repos/owner/repo/deployments",
    },
  }
  return deepMerge(base, partial as ActionRun)
}

export async function createFakeReadonlyGithubClient(
  { actionRuns, actionWorkflows, commits, pullCommits, pulls, syncInfos }: Partial<{
    actionRuns: Array<ActionRun>
    actionWorkflows: Array<ActionWorkflow>
    commits: Array<GithubCommit>
    pullCommits: Array<BoundGithubPullCommit>
    pulls: Array<GithubPull>
    syncInfos: Array<SyncInfo>
  }> = {},
): Promise<ReadonlyGithubClient> {
  return new ReadonlyAloeGithubClient({
    owner: "owner",
    repo: "repo",
    db: {
      actionRuns: await MockAloeDatabase.new({
        schema: actionRunSchema,
        documents: actionRuns,
      }),
      actionWorkflows: await MockAloeDatabase.new({
        schema: actionWorkflowSchema,
        documents: actionWorkflows,
      }),
      commits: await MockAloeDatabase.new({
        schema: githubCommitSchema,
        documents: commits,
      }),
      pullCommits: await MockAloeDatabase.new({
        schema: boundGithubPullCommit,
        documents: pullCommits,
      }),
      pulls: await MockAloeDatabase.new({
        schema: githubPullSchema,
        documents: pulls,
      }),
      syncs: await MockAloeDatabase.new({
        schema: syncInfoSchema,
        documents: syncInfos,
      }),
    },
  })
}

export async function createFakeGithubClient(
  { actionRuns, actionWorkflows, commits, pullCommits, pulls, syncInfos }: Partial<{
    actionRuns: Array<ActionRun>
    actionWorkflows: Array<ActionWorkflow>
    commits: Array<GithubCommit>
    pullCommits: Array<BoundGithubPullCommit>
    pulls: Array<GithubPull>
    syncInfos: Array<SyncInfo>
  }> = {},
): Promise<GithubClient> {
  return new AloeGithubClient({
    owner: "owner",
    repo: "repo",
    token: "token",
    db: {
      actionRuns: await MockAloeDatabase.new({
        schema: actionRunSchema,
        documents: actionRuns,
      }),
      actionWorkflows: await MockAloeDatabase.new({
        schema: actionWorkflowSchema,
        documents: actionWorkflows,
      }),
      commits: await MockAloeDatabase.new({
        schema: githubCommitSchema,
        documents: commits,
      }),
      pullCommits: await MockAloeDatabase.new({
        schema: boundGithubPullCommit,
        documents: pullCommits,
      }),
      pulls: await MockAloeDatabase.new({
        schema: githubPullSchema,
        documents: pulls,
      }),
      syncs: await MockAloeDatabase.new({
        schema: syncInfoSchema,
        documents: syncInfos,
      }),
    },
  })
}
