import { assertUnreachable } from "../../utils/mod.ts"

import { GithubPull, GithubPullDateKey } from "../api/pulls/mod.ts"
import { GithubActionRun } from "../api/action-run/mod.ts"
import { BoundGithubPullCommit, GithubPullCommitDateKey } from "../api/pull-commits/mod.ts"

export function sortPullsByKey(
  pulls: Array<GithubPull>,
  key: GithubPullDateKey = "updated_at",
): Array<GithubPull> {
  return pulls.sort((a, b) => {
    const aVal = a[key]
    const aT = aVal === null ? 0 : new Date(aVal).getTime()
    const bVal = b[key]
    const bT = bVal === null ? 0 : new Date(bVal).getTime()
    if (aT === bT) return 0
    if (aT < bT) return -1
    if (aT > bT) return 1
    throw new Error(
      `Error sorting pulls ${a.number} (${aT}) and ${b.number} (${bT})`,
    )
  })
}

export function sortActionRunsKey(
  items: Array<GithubActionRun>,
  key: "created_at" | "updated_at" = "updated_at",
): Array<GithubActionRun> {
  return items.sort((a, b) => {
    const aVal: string | null = a[key]
    const aT = aVal === null ? 0 : new Date(aVal).getTime()
    const bVal: string | null = b[key]
    const bT = bVal === null ? 0 : new Date(bVal).getTime()
    if (aT === bT) return 0
    if (aT < bT) return -1
    if (aT > bT) return 1
    throw new Error(
      `Error sorting ${aT} and ${bT}`,
    )
  })
}

export function sortPullCommitsByKey(
  pulls: Array<BoundGithubPullCommit>,
  key: GithubPullCommitDateKey = "commit.author",
): Array<BoundGithubPullCommit> {
  return pulls.sort((a, b) => {
    let aVal: string | undefined
    let bVal: string | undefined
    switch (key) {
      case "commit.author":
        aVal = a.commit?.author?.date
        bVal = b.commit?.author?.date
        break
      case "commit.committer":
        aVal = a.commit?.committer?.date
        bVal = b.commit?.committer?.date
        break
      default:
        assertUnreachable(key)
    }
    const aT = aVal === undefined ? 0 : new Date(aVal).getTime()
    const bT = bVal === undefined ? 0 : new Date(bVal).getTime()
    if (aT === bT) return 0
    if (aT < bT) return -1
    if (aT > bT) return 1
    throw new Error(
      `Error sorting ${aT} and ${bT}`,
    )
  })
}
