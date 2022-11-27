import { deepMerge } from "../deps.ts";
import { DeepPartial } from "../types.ts";

import {
  GithubPull,
  githubPullSchema,
  ReadonlyGithubClient,
  SyncInfo,
  syncInfoSchema,
} from "./types.ts";
import { ReadonlyAloeGithubClient } from "./aloe-github-client.ts";
import { MockAloeDatabase } from "../db/aloe-database.ts";

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
    collaborators_url:
      "https://api.github.com/repos/owner/repo/collaborators{/collaborator}",
    teams_url: "https://api.github.com/repos/owner/repo/teams",
    hooks_url: "https://api.github.com/repos/owner/repo/hooks",
    issue_events_url:
      "https://api.github.com/repos/owner/repo/issues/events{/number}",
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
    git_commits_url:
      "https://api.github.com/repos/owner/repo/git/commits{/sha}",
    comments_url: "https://api.github.com/repos/owner/repo/comments{/number}",
    issue_comment_url:
      "https://api.github.com/repos/owner/repo/issues/comments{/number}",
    contents_url: "https://api.github.com/repos/owner/repo/contents/{+path}",
    compare_url:
      "https://api.github.com/repos/owner/repo/compare/{base}...{head}",
    merges_url: "https://api.github.com/repos/owner/repo/merges",
    archive_url:
      "https://api.github.com/repos/owner/repo/{archive_format}{/ref}",
    downloads_url: "https://api.github.com/repos/owner/repo/downloads",
    issues_url: "https://api.github.com/repos/owner/repo/issues{/number}",
    pulls_url: "https://api.github.com/repos/owner/repo/pulls{/number}",
    milestones_url:
      "https://api.github.com/repos/owner/repo/milestones{/number}",
    notifications_url:
      "https://api.github.com/repos/owner/repo/notifications{?since,all,participating}",
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
  };
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
    labels: [
      {
        id: 1234567890,
        node_id: "AB_cd",
        url: "https://api.github.com/repos/owner/repo/labels/Ham",
        name: "Ham",
        color: "9CD54A",
        default: false,
        description: "description",
      },
    ],
    commits_url: `https://api.github.com/repos/owner/repo/pulls/${
      partial.number || 1
    }/commits`,
    review_comments_url: `https://api.github.com/repos/owner/repo/pulls/${
      partial.number || 1
    }/comments`,
    review_comment_url:
      "https://api.github.com/repos/owner/repo/pulls/comments{/number}",
    comments_url: `https://api.github.com/repos/owner/repo/issues/${
      partial.number || 1
    }/comments`,
    statuses_url:
      "https://api.github.com/repos/owner/repo/statuses/da39a3ee5e6b4b0d3255bfef95601890afd80709",
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
        following_url:
          "https://api.github.com/users/owner/following{/other_user}",
        gists_url: "https://api.github.com/users/owner/gists{/gist_id}",
        starred_url:
          "https://api.github.com/users/owner/starred{/owner}{/repo}",
        subscriptions_url: "https://api.github.com/users/owner/subscriptions",
        organizations_url: "https://api.github.com/users/owner/orgs",
        repos_url: "https://api.github.com/users/owner/repos",
        events_url: "https://api.github.com/users/owner/events{/privacy}",
        received_events_url:
          "https://api.github.com/users/owner/received_events",
        type: "Organization",
        site_admin: false,
      },
      repo,
    },
    base: {
      label: "Foo:main",
      ref: "main",
      sha: "de9f2c7fd25e1b3afad3e85a0bd17d9b100db4b3",
      repo,
    },
    _links: {
      html: { href: "https://url" },
      self: { href: "https://url" },
      commits: {
        href: `https://api.github.com/repos/owner/repo/pulls/${
          partial.number || 1
        }/commits`,
      },
      statuses: {
        href:
          "https://api.github.com/repos/owner/repo/statuses/da39a3ee5e6b4b0d3255bfef95601890afd80709",
      },
    },
  };
  return deepMerge(base, partial as GithubPull);
}

export function getFakeSyncInfo(partial: DeepPartial<SyncInfo> = {}): SyncInfo {
  const base: SyncInfo = {
    createdAt: partial.updatedAt
      ? partial.updatedAt - 1
      : new Date("2000-01-01T00:00:00Z").getTime(),
    updatedAt: partial.createdAt
      ? partial.createdAt + 1
      : new Date("2000-01-01T00:01:00Z").getTime(),
  };
  return deepMerge(base, partial as SyncInfo);
}

export async function createFakeGithubClient(
  { pulls, syncs }: Partial<{
    pulls: Array<DeepPartial<GithubPull>>;
    syncs: Array<DeepPartial<SyncInfo>>;
  }> = {},
): Promise<ReadonlyGithubClient> {
  return new ReadonlyAloeGithubClient({
    owner: "owner",
    repo: "repo",
    db: {
      pulls: await MockAloeDatabase.new({
        schema: githubPullSchema,
        documents: pulls?.map(getFakePull),
      }),
      syncs: await MockAloeDatabase.new({
        schema: syncInfoSchema,
        documents: syncs?.map(getFakeSyncInfo),
      }),
    },
  });
}
