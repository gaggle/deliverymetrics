import { deepMerge } from "std:deep-merge"

import { DeepPartial } from "../../utils/types.ts"

import { JiraSyncInfo } from "./jira-sync-info-schema.ts"

export function getFakeJiraSyncInfo(partial: DeepPartial<JiraSyncInfo> = {}): JiraSyncInfo {
  const base: JiraSyncInfo = {
    type: "search",
    createdAt: partial.updatedAt ? partial.updatedAt - 1 : new Date("2000-01-01T00:00:00Z").getTime(),
    updatedAt: partial.createdAt ? partial.createdAt + 1 : new Date("2000-01-01T00:01:00Z").getTime(),
  }
  return deepMerge(base, partial as JiraSyncInfo)
}
