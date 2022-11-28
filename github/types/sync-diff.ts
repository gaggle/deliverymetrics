import { Epoch } from "../../types.ts";
import { GithubPull } from "./github-pull.ts";

export interface GithubDiff {
  syncedAt: Epoch;
  newPulls: Array<GithubPull>;
  updatedPulls: Array<{ prev: GithubPull; updated: GithubPull }>;
}
