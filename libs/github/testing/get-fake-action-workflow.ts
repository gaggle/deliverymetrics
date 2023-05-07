import { deepMerge } from "std:deep-merge"

import { ActionWorkflow } from "../schemas/github-action-workflow.ts"

import { DeepPartial } from "../../types.ts"

export function getFakeActionWorkflow(partial: DeepPartial<ActionWorkflow> = {}): ActionWorkflow {
  const base: ActionWorkflow = {
    "id": 161335,
    "node_id": "MDg6V29ya2Zsb3cxNjEzMzU=",
    "name": "CI",
    "path": ".github/workflows/blank.yaml",
    "state": "active",
    "created_at": "2020-01-08T23:48:37.000-08:00",
    "updated_at": "2020-01-08T23:50:21.000-08:00",
    "url": "https://api.github.com/repos/octo-org/octo-repo/actions/workflows/161335",
    "html_url": "https://github.com/octo-org/octo-repo/blob/master/.github/workflows/161335",
    "badge_url": "https://github.com/octo-org/octo-repo/workflows/CI/badge.svg",
  }
  return deepMerge(base, partial as ActionWorkflow)
}
