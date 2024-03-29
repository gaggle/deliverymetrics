import { deepMerge } from "std:deep-merge"

import { DeepPartial } from "../../../../utils/types.ts"

import { GithubActionWorkflow } from "./github-action-workflow-schema.ts"

export function getFakeGithubActionWorkflow(partial: DeepPartial<GithubActionWorkflow> = {}): GithubActionWorkflow {
  const base: GithubActionWorkflow = {
    "id": 161335,
    "node_id": "MDg6V29ya2Zsb3cxNjEzMzU=",
    "name": "CI",
    "path": ".github/workflows/name.yml",
    "state": "active",
    "created_at": "2020-01-08T23:48:37.000-08:00",
    "updated_at": "2020-01-08T23:50:21.000-08:00",
    "url": "https://api.github.com/repos/octo-org/octo-repo/actions/workflows/161335",
    "html_url": "https://github.com/octo-org/octo-repo/blob/master/.github/workflows/161335",
    "badge_url": "https://github.com/octo-org/octo-repo/workflows/CI/badge.svg",
  }
  return deepMerge(base, partial as GithubActionWorkflow)
}
