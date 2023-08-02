import { deepMerge } from "std:deep-merge"

import { DeepPartial } from "../../../../utils/types.ts"

import { BoundGithubPullCommit, GithubPullCommit } from "./github-pull-commit-schema.ts"

export function getFakeGithubPullCommit(partial?: DeepPartial<GithubPullCommit>): GithubPullCommit
export function getFakeGithubPullCommit(partial?: DeepPartial<BoundGithubPullCommit>): BoundGithubPullCommit
export function getFakeGithubPullCommit(
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
