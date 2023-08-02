import { GithubPull } from "../api/pulls/github-pull-schema.ts"

export function stringifyPull(pull: GithubPull): string {
  return `#${pull.number} (${pull.draft ? "draft" : pull.state}) ${pull._links.html.href}`
}

export function stringifyUpdatedPull(
  { prev, updated }: { prev: GithubPull; updated: GithubPull },
): string {
  return `#${updated.number} (${prev.draft ? "draft" : prev.state} -> ${
    updated.draft ? "draft" : updated.state
  }) ${updated._links.html.href}`
}
