import { deepMerge } from "std:deep-merge"

import { DeepPartial } from "../../../types.ts"

import { GithubStatsContributor } from "./github-stats-contributor-schema.ts"

/**
 * # Get all contributor commit activity
 *
 * Returns the total number of commits authored by the contributor.
 * In addition, the response includes a Weekly Hash (weeks array) with the following information:
 * * w - Start of the week, given as a Unix timestamp.
 * * a - Number of additions
 * * d - Number of deletions
 * * c - Number of commits
 */
export function getFakeGithubStatsContributor(
  partial: DeepPartial<GithubStatsContributor> = {},
): GithubStatsContributor {
  const base: GithubStatsContributor = {
    "author": {
      "login": "octocat",
      "id": 1,
      "node_id": "MDQ6VXNlcjE=",
      "avatar_url": "https://github.com/images/error/octocat_happy.gif",
      "gravatar_id": "",
      "url": "https://api.github.com/users/octocat",
      "html_url": "https://github.com/octocat",
      "followers_url": "https://api.github.com/users/octocat/followers",
      "following_url": "https://api.github.com/users/octocat/following{/other_user}",
      "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
      "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
      "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
      "organizations_url": "https://api.github.com/users/octocat/orgs",
      "repos_url": "https://api.github.com/users/octocat/repos",
      "events_url": "https://api.github.com/users/octocat/events{/privacy}",
      "received_events_url": "https://api.github.com/users/octocat/received_events",
      "type": "User",
      "site_admin": false,
    },
    "total": 135,
    "weeks": partial.weeks || [{ "w": 1367712000, "a": 6898, "d": 77, "c": 10 }],
  }
  delete partial.weeks
  return deepMerge(base, partial as GithubStatsContributor)
}
