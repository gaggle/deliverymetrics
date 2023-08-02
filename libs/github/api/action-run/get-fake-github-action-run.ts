import { deepMerge } from "std:deep-merge"

import { DeepPartial } from "../../../../utils/types.ts"

import { GithubActionRun } from "./github-action-run-schema.ts"

export function getFakeGithubActionRun(partial: DeepPartial<GithubActionRun> = {}): GithubActionRun {
  const base: GithubActionRun = {
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
  return deepMerge(base, partial as GithubActionRun)
}
