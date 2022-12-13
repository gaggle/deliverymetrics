import { ActionRun, GithubPull, GithubPullDateKey } from "../types/mod.ts";

export function sortPullsByKey(
  pulls: Array<GithubPull>,
  key: GithubPullDateKey = "updated_at",
): Array<GithubPull> {
  return pulls.sort((a, b) => {
    const aVal = a[key];
    const aT = aVal === null ? 0 : new Date(aVal).getTime();
    const bVal = b[key];
    const bT = bVal === null ? 0 : new Date(bVal).getTime();
    if (aT === bT) return 0;
    if (aT < bT) return -1;
    if (aT > bT) return 1;
    throw new Error(
      `Error sorting pulls ${a.number} (${aT}) and ${b.number} (${bT})`,
    );
  });
}

export function sortActionRunsKey(
  items: Array<ActionRun>,
  key: "created_at" | "updated_at" = "updated_at",
): Array<ActionRun> {
  return items.sort((a, b) => {
    const aVal = a[key];
    const aT = aVal === null ? 0 : new Date(aVal).getTime();
    const bVal = b[key];
    const bT = bVal === null ? 0 : new Date(bVal).getTime();
    if (aT === bT) return 0;
    if (aT < bT) return -1;
    if (aT > bT) return 1;
    throw new Error(
      `Error sorting ${aT} and ${bT}`,
    );
  });
}
