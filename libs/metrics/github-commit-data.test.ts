import { assertEquals } from "dev:asserts"

import { asyncToArray, first } from "../../utils/utils.ts"

import { getFakeGithubCommit } from "../github/api/commits/mod.ts"
import { createFakeReadonlyGithubClient, getFakeSyncInfo } from "../github/testing/mod.ts"

import { yieldCommitData } from "./github-commit-data.ts"

Deno.test("yieldCommitData", async (t) => {
  await t.step("yields commit and calculated fields", async () => {
    const commit = getFakeGithubCommit({
      commit: {
        author: { name: "Author", email: "author@github.com" },
        committer: { name: "Committer", email: "committer@github.com" },
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
      contributors: [
        "Author <author@github.com>",
        "Committer <committer@github.com>",
        "Maria Octocat <maria.octocat@github.com>",
        "dependabot[bot] <dependabot[bot]@users.noreply.github.com>",
      ],
    }])
  })

  await t.step("dedupes contributors", async () => {
    const gh = await createFakeReadonlyGithubClient({
      syncInfos: [getFakeSyncInfo({ type: "commit", createdAt: 0, updatedAt: 0 })],
      commits: [getFakeGithubCommit({
        commit: {
          author: { name: "Person", email: "person@github.com" },
          committer: { name: "Person", email: "person@github.com" },
        },
      })],
    })

    const actual = await first(yieldCommitData(gh))
    assertEquals(actual.contributors, ["Person <person@github.com>"])
  })

  await t.step("supports no co-authors, author, or committer", async () => {
    const commit = getFakeGithubCommit({
      commit: {
        author: null,
        committer: null,
        message: "foo",
      },
    })
    const gh = await createFakeReadonlyGithubClient({
      syncInfos: [getFakeSyncInfo({ type: "commit", createdAt: 0, updatedAt: 0 })],
      commits: [commit],
    })

    assertEquals(await asyncToArray(yieldCommitData(gh)), [{
      commit,
      coauthors: [],
      contributors: [],
    }])
  })

  await t.step("supports missing info in author or committer", async () => {
    const gh = await createFakeReadonlyGithubClient({
      syncInfos: [getFakeSyncInfo({ type: "commit", createdAt: 0, updatedAt: 0 })],
      commits: [getFakeGithubCommit({
        commit: {
          author: { name: "Author", email: undefined },
          committer: { name: undefined, email: "committer@github.com" },
        },
      })],
    })

    const actual = await first(yieldCommitData(gh))
    assertEquals(actual.contributors, ["Author", "<committer@github.com>"])
  })

  await t.step("doesn't yield commits that were committed more than specified days ago", async () => {
    const gh = await createFakeReadonlyGithubClient({
      syncInfos: [
        getFakeSyncInfo({
          type: "commit",
          createdAt: new Date("1980-01-10T00:00:00Z").getTime(),
          updatedAt: new Date("1980-01-10T00:00:00Z").getTime(),
        }),
      ],
      commits: [
        getFakeGithubCommit({ commit: { committer: { date: "1980-01-04T00:00:00Z" } }, node_id: "6d" }),
        getFakeGithubCommit({ commit: { committer: { date: "1980-01-05T00:00:00Z" } }, node_id: "5d" }),
        getFakeGithubCommit({ commit: { committer: { date: "1980-01-10T00:00:00Z" } }, node_id: "0d" }),
      ],
    })

    const actual = await asyncToArray(yieldCommitData(gh, { committedMaxDaysAgo: 5 }))

    assertEquals(actual.map((el) => el.commit.node_id), ["5d", "0d"])
  })

  await t.step("doesn't yield commits that were AUTHORED more than specified days ago", async () => {
    const gh = await createFakeReadonlyGithubClient({
      syncInfos: [
        getFakeSyncInfo({
          type: "commit",
          createdAt: new Date("1980-01-10T00:00:00Z").getTime(),
          updatedAt: new Date("1980-01-10T00:00:00Z").getTime(),
        }),
      ],
      commits: [
        getFakeGithubCommit({ commit: { author: { date: "1980-01-04T00:00:00Z" } }, node_id: "6d" }),
        getFakeGithubCommit({ commit: { author: { date: "1980-01-05T00:00:00Z" } }, node_id: "5d" }),
        getFakeGithubCommit({ commit: { author: { date: "1980-01-10T00:00:00Z" } }, node_id: "0d" }),
      ],
    })

    const actual = await asyncToArray(yieldCommitData(gh, { authoredMaxDaysAgo: 5 }))

    assertEquals(actual.map((el) => el.commit.node_id), ["5d", "0d"])
  })
})
