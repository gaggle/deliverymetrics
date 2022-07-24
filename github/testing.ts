import { deepMerge } from "../deps.ts";
import { DeepPartial } from "../types.ts";

import { GithubPull } from "./types.ts";

export function getFakePull(partial: DeepPartial<GithubPull> = {}): GithubPull {
  return deepMerge(
    {
      url: "https://url",
      id: 1,
      node_id: "node_id",
      html_url: "https://url",
      number: 1,
      state: "open",
      locked: false,
      title: "title",
      body: null,
      created_at: "2022-10-03T16:53:15Z",
      updated_at: "2022-10-03T20:26:18Z",
      closed_at: null,
      merged_at: null,
      draft: false,
      base: {
        label: "Foo:main",
        ref: "main",
        sha: "f357074d2aa6b319ee5475a2bafb65bd1416074d",
      },
      _links: {
        html: { href: "https://url" },
        self: { href: "https://url" },
      },
    },
    partial
  ) as GithubPull;
}
