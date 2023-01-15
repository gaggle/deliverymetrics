import { MergedGithubPull } from "../github/types/github-pull.ts";
import { dayStart, nextDate } from "./date-utils.ts";
import { BoundGithubPullCommit } from "../github/types/github-pull-commit.ts";

/**
 * ## Pull Request Lead Time
 *
 * The lead-time metric gives you an idea of how many times (usually in days)
 * pull requests take to be merged or closed.
 *
 * To find this number, you need to track every pull request.
 * Save the date and time for each pull request when opened,
 * and then, when it’s merged, save it too.
 *
 * This metric is especially useful for raising questions and start investigations before it’s too late.
 * A good practice is to measure this number over time so that you can spot trends and behaviors more pragmatically.
 *
 * https://sourcelevel.io/blog/5-metrics-engineering-managers-can-extract-from-pull-requests
 */
export function calculatePullRequestLeadTime(pull: MergedGithubPull): number {
  return nextDate(pull.merged_at).getTime() - dayStart(pull.created_at).getTime();
}

/**
 * ## Pull Request Time to Merge
 *
 * Time to Merge is how much time it takes for the first commit of a branch to reach main.
 * In practice, the math is simple: It’s the timestamp of the oldest commit of a branch
 * minus the timestamp of the merge commit.
 *
 * https://sourcelevel.io/blog/5-metrics-engineering-managers-can-extract-from-pull-requests
 */
export function calculatePullRequestTimeToMerge(
  pull: MergedGithubPull,
  earliestCommit: BoundGithubPullCommit,
): number | undefined {
  const earliestCommitDate = earliestCommit?.commit?.author?.date;
  if (!earliestCommitDate) {
    return undefined;
  }
  return nextDate(pull.merged_at).getTime() - dayStart(earliestCommitDate).getTime();
}
