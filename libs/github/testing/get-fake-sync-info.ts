import { deepMerge } from "std:deep-merge"

import { DeepPartial } from "../../types.ts"

import { SyncInfo } from "../schemas/sync-info.ts"

export function getFakeSyncInfo(partial: DeepPartial<SyncInfo> = {}): SyncInfo {
  const base: SyncInfo = {
    type: "pull",
    createdAt: partial.updatedAt ? partial.updatedAt - 1 : new Date("2000-01-01T00:00:00Z").getTime(),
    updatedAt: partial.createdAt ? partial.createdAt + 1 : new Date("2000-01-01T00:01:00Z").getTime(),
  }
  return deepMerge(base, partial as SyncInfo)
}
