import { deepMerge } from "std:deep-merge"

import { DeepPartial } from "../../../utils/types.ts"

import { SyncInfo } from "../types/sync-info-schema.ts"

export function getFakeSyncInfo(partial: DeepPartial<SyncInfo> = {}): SyncInfo {
  const base: SyncInfo = {
    type: "pull",
    createdAt: partial.updatedAt ? partial.updatedAt - 1 : new Date("2000-01-01T00:00:00Z").getTime(),
    updatedAt: partial.createdAt ? partial.createdAt + 1 : new Date("2000-01-01T00:01:00Z").getTime(),
  }
  return deepMerge(base, partial as SyncInfo)
}
