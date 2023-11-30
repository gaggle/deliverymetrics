import { githubActionRunsRestApiSpec } from "./action-run/mod.ts"

import { githubActionWorkflowRestApiSpec } from "./action-workflows/mod.ts"

import { githubCommitRestApiSpec } from "./commits/mod.ts"

import { githubPullCommitRestApiSpec } from "./pull-commits/mod.ts"

import { githubPullRestApiSpec } from "./pulls/mod.ts"

import { githubReleaseRestApiSpec } from "./releases/mod.ts"

import { githubRepositoryRestApiSpec } from "./repository/mod.ts"

import { githubStatsCodeFrequencyRestApiSpec } from "./stats-code-frequency/mod.ts"

import { githubStatsCommitActivityRestApiSpec } from "./stats-commit-activity/mod.ts"

import { githubStatsContributorRestApiSpec } from "./stats-contributors/mod.ts"

import { githubStatsParticipationRestApiSpec } from "./stats-participation/mod.ts"

import { githubStatsPunchCardRestApiSpec } from "./stats-punch-card/mod.ts"

export const githubRestSpec = {
  /**
   * https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2022-11-28#list-workflow-runs-for-a-repository
   */
  actionRuns: githubActionRunsRestApiSpec,
  /**
   * https://docs.github.com/en/rest/actions/workflows?apiVersion=2022-11-28
   */
  actionWorkflows: githubActionWorkflowRestApiSpec,
  /**
   * https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#list-commits
   */
  commits: githubCommitRestApiSpec,
  /**
   * https://docs.github.com/en/rest/pulls/pulls#list-commits-on-a-pull-request
   */
  pullCommits: githubPullCommitRestApiSpec,
  /**
   * https://docs.github.com/en/rest/pulls/pulls
   */
  pulls: githubPullRestApiSpec,
  /**
   * # Get the weekly commit activity
   * Returns a weekly aggregate of the number of additions and deletions pushed to a repository.
   *
   * ## Headers
   * * accept string
   * Setting to application/vnd.github+json is recommended.
   *
   * ## Path parameters
   * * owner string Required
   * The account owner of the repository. The name is not case sensitive.
   * * repo string Required
   * The name of the repository. The name is not case sensitive.
   *
   * ## HTTP response status codes for "Get the weekly commit activity"
   *
   * * 200 Returns a weekly aggregate of the number of additions and deletions pushed to a repository.
   * * 202 Accepted
   * * 204 A header with no content is returned.
   *
   * ## Note
   * Computing repository statistics is an expensive operation,
   * so we try to return cached data whenever possible.
   *
   * If the data hasn't been cached when you query a repository's statistics,
   * you'll receive a 202 response;
   * a background job is also fired to start compiling these statistics.
   * You should allow the job a short time to complete,
   * and then submit the request again.
   *
   * If the job has completed,
   * that request will receive a 200 response with the statistics in the response body.
   *
   * Repository statistics are cached by the SHA of the repository's default branch;
   * pushing to the default branch resets the statistics cache.
   */
  statsCodeFrequency: githubStatsCodeFrequencyRestApiSpec,
  /**
   * # Get the last year of commit activity
   * Returns the last year of commit activity grouped by week.
   * The days array is a group of commits per day, starting on Sunday.
   *
   * ## Headers
   * * accept string
   * Setting to application/vnd.github+json is recommended.
   *
   * ## Path parameters
   * * owner string Required
   * The account owner of the repository. The name is not case sensitive.
   * * repo string Required
   * The name of the repository. The name is not case sensitive.
   *
   * ## HTTP response status codes for "Get the last year of commit activity"
   * * 200 OK
   * * 202 Accepted
   * * 204 A header with no content is returned.
   *
   * ## Note
   * Computing repository statistics is an expensive operation,
   * so we try to return cached data whenever possible.
   *
   * If the data hasn't been cached when you query a repository's statistics,
   * you'll receive a 202 response;
   * a background job is also fired to start compiling these statistics.
   * You should allow the job a short time to complete,
   * and then submit the request again.
   *
   * If the job has completed,
   * that request will receive a 200 response with the statistics in the response body.
   *
   * Repository statistics are cached by the SHA of the repository's default branch;
   * pushing to the default branch resets the statistics cache.
   */
  statsCommitActivity: githubStatsCommitActivityRestApiSpec,
  /**
   * # Get all contributor commit activity
   * Returns the total number of commits authored by the contributor.
   * In addition,
   * the response includes a Weekly Hash (weeks array) with the following information:
   * * w - Start of the week, given as a Unix timestamp.
   * * a - Number of additions
   * * d - Number of deletions
   * * c - Number of commits
   *
   * ## Headers
   * * accept string
   * Setting to application/vnd.github+json is recommended.
   *
   * ## Path parameters
   * * owner string Required
   * The account owner of the repository. The name is not case sensitive.
   * * repo string Required
   * The name of the repository. The name is not case sensitive.
   *
   * ## HTTP response status codes for "Get all contributor commit activity"
   * * 200 OK
   * * 202 Accepted
   * * 204 A header with no content is returned.
   *
   * ## Note
   * Computing repository statistics is an expensive operation,
   * so we try to return cached data whenever possible.
   *
   * If the data hasn't been cached when you query a repository's statistics,
   * you'll receive a 202 response;
   * a background job is also fired to start compiling these statistics.
   * You should allow the job a short time to complete,
   * and then submit the request again.
   *
   * If the job has completed,
   * that request will receive a 200 response with the statistics in the response body.
   *
   * Repository statistics are cached by the SHA of the repository's default branch;
   * pushing to the default branch resets the statistics cache.
   *
   * https://docs.github.com/en/rest/metrics/statistics?apiVersion=2022-11-28#get-all-contributor-commit-activity
   */
  statsContributors: githubStatsContributorRestApiSpec,
  /**
   * # Get the weekly commit count
   * Returns the total commit counts for the owner and total commit counts in all.
   * all is everyone combined, including the owner in the last 52 weeks.
   * If you'd like to get the commit counts for non-owners, you can subtract owner from all.
   *
   * The array order is oldest week (index 0) to most recent week.
   *
   * The most recent week is seven days ago at UTC midnight to today at UTC midnight.
   *
   * ## Headers
   * * accept string
   * Setting to application/vnd.github+json is recommended.
   *
   * ## Path parameters
   * * owner string Required
   * The account owner of the repository. The name is not case sensitive.
   * * repo string Required
   * The name of the repository. The name is not case sensitive.
   *
   * ## HTTP response status codes for "Get the weekly commit count"
   * * 200 The array order is oldest week (index 0) to most recent week.
   * * 404 Resource not found
   *
   * ## Note
   * Computing repository statistics is an expensive operation,
   * so we try to return cached data whenever possible.
   *
   * If the data hasn't been cached when you query a repository's statistics,
   * you'll receive a 202 response;
   * a background job is also fired to start compiling these statistics.
   * You should allow the job a short time to complete,
   * and then submit the request again.
   *
   * If the job has completed,
   * that request will receive a 200 response with the statistics in the response body.
   *
   * Repository statistics are cached by the SHA of the repository's default branch;
   * pushing to the default branch resets the statistics cache.
   */
  statsParticipation: githubStatsParticipationRestApiSpec,
  /**
   * # Get the hourly commit count for each day
   * Each array contains the day number, hour number, and number of commits:
   * * 0-6: Sunday - Saturday
   * * 0-23: Hour of day
   * * Number of commits
   *
   * For example, [2, 14, 25] indicates that there were 25 total commits, during the 2:00pm hour on Tuesdays. All times are based on the time zone of individual commits.
   *
   * ## Headers
   * * accept string
   * Setting to application/vnd.github+json is recommended.
   *
   * ## Path parameters
   * * owner string Required
   * The account owner of the repository. The name is not case sensitive.
   * * repo string Required
   * The name of the repository. The name is not case sensitive.
   *
   * ## HTTP response status codes for "Get the hourly commit count for each day"
   * * 200 For example, [2, 14, 25] indicates that there were 25 total commits, during the 2:00pm hour on Tuesdays. All times are based on the time zone of individual commits.
   * * 204 A header with no content is returned.
   *
   * ## Note
   * Computing repository statistics is an expensive operation,
   * so we try to return cached data whenever possible.
   *
   * If the data hasn't been cached when you query a repository's statistics,
   * you'll receive a 202 response;
   * a background job is also fired to start compiling these statistics.
   * You should allow the job a short time to complete,
   * and then submit the request again.
   *
   * If the job has completed,
   * that request will receive a 200 response with the statistics in the response body.
   *
   * Repository statistics are cached by the SHA of the repository's default branch;
   * pushing to the default branch resets the statistics cache.
   */
  statsPunchCard: githubStatsPunchCardRestApiSpec,
  /**
   * # List releases
   * This returns a list of releases,
   * which does not include regular Git tags that have not been associated with a release.
   * To get a list of Git tags, use the Repository Tags API.
   *
   * Information about published releases are available to everyone.
   * Only users with push access will receive listings for draft releases.
   *
   * ## Headers
   * * accept string
   * Setting to application/vnd.github+json is recommended.
   *
   * ## Path parameters
   * * owner string Required
   * The account owner of the repository. The name is not case sensitive.
   * * repo string Required
   * The name of the repository. The name is not case sensitive.
   *
   * ## Query parameters
   * * per_page integer
   * The number of results per page (max 100).
   * Default: 30
   *
   * * page integer
   * Page number of the results to fetch.
   * Default: 1
   *
   * ## HTTP response status codes for "List releases"
   * * 200 OK
   * * 404 Resource not found
   *
   * [https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#list-releases](https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#list-releases)
   */
  releases: githubReleaseRestApiSpec,
  /**
   * Get a repository
   * The parent and source objects are present when the repository is a fork.
   * parent is the repository this repository was forked from,
   * source is the ultimate source for the network.
   *
   * Note: In order to see the security_and_analysis block for a repository
   * you must have admin permissions for the repository
   * or be an owner or security manager for the organization that owns the repository.
   * For more information, see "Managing security managers in your organization."
   *
   * https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#get-a-repository
   */
  repository: githubRepositoryRestApiSpec,
} as const
