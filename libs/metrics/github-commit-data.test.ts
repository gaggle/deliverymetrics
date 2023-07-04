import { getFakeGithubCommit } from "../github/api/commits/mod.ts"

import { createFakeReadonlyGithubClient, getFakeSyncInfo } from "../github/testing/mod.ts"

import { yieldCommitData } from "./github-commit-data.ts"
import { assertEquals } from "dev:asserts"
import { asyncToArray } from "../utils/utils.ts"

Deno.test("yieldCommitData", async (t) => {
  await t.step("yields commit and calculated fields", async () => {
    const commit = getFakeGithubCommit({
      commit: {
        message:
          "foo\n\nCo-authored-by: Maria Octocat <maria.octocat@github.com>\nCo-authored-by: dependabot[bot] <dependabot[bot]@users.noreply.github.com>",
      },
    })
    const gh = await createFakeReadonlyGithubClient({
      syncInfos: [getFakeSyncInfo({ type: "commit", createdAt: 0, updatedAt: 0 })],
      commits: [commit],
    })

    assertEquals(await asyncToArray(yieldCommitData(gh)), [{
      commit,
      coauthors: [
        "Maria Octocat <maria.octocat@github.com>",
        "dependabot[bot] <dependabot[bot]@users.noreply.github.com>",
      ],
    }])
  })
})
