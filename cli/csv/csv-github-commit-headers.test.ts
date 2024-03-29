import { assertEquals } from "dev:asserts"

import { getFakeGithubCommit } from "../../libs/github/api/commits/get-fake-github-commit.ts"

import { arrayToAsyncGenerator, asyncToArray } from "../../utils/utils.ts"

import { githubCommitsAsCsv } from "./csv-github-commit-headers.ts"

Deno.test("githubCommitsAsCsv", async (t) => {
  await t.step("converts commit data to a csv commit row", async () => {
    const commit = getFakeGithubCommit({
      commit: { message: "Title\n\nAnd body" },
    })
    const result = await asyncToArray(githubCommitsAsCsv(arrayToAsyncGenerator([{
      commit,
      coauthors: ["foo", "bar"],
      contributors: ["ham", "spam", "foo", "bar"],
    }])))
    assertEquals(result, [{
      "Commit Co-Authors": "foo; bar",
      "# Commit Co-Authors": "2",
      "Contributors": "ham; spam; foo; bar",
      "# Contributors": "4",
      "Title": "Title",
      "author.avatar_url": commit.author!.avatar_url!,
      "author.events_url": commit.author!.events_url!,
      "author.followers_url": commit.author!.followers_url!,
      "author.following_url": commit.author!.following_url!,
      "author.gists_url": commit.author!.gists_url!,
      "author.gravatar_id": "",
      "author.html_url": commit.author!.html_url!,
      "author.id": "1",
      "author.login": commit.author!.login!,
      "author.node_id": commit.author!.node_id!,
      "author.organizations_url": commit.author!.organizations_url!,
      "author.received_events_url": commit.author!.received_events_url!,
      "author.repos_url": commit.author!.repos_url!,
      "author.site_admin": "false",
      "author.starred_url": commit.author!.starred_url!,
      "author.subscriptions_url": commit.author!.subscriptions_url!,
      "author.type": commit.author!.type!,
      "author.url": commit.author!.url!,
      "comments_url": commit.comments_url,
      "commit.author.date": commit.commit.author!.date!,
      "commit.author.email": commit.commit.author!.email!,
      "commit.author.name": commit.commit.author!.name!,
      "commit.comment_count": "0",
      "commit.committer.date": commit.commit.committer!.date!,
      "commit.committer.email": commit.commit.committer!.email!,
      "commit.committer.name": commit.commit.committer!.name!,
      "commit.message": commit.commit.message,
      "commit.tree.sha": commit.commit.tree.sha,
      "commit.tree.url": commit.commit.tree.url,
      "commit.url": commit.commit.url,
      "commit.verification.payload": "null",
      "commit.verification.reason": commit.commit.verification!.reason,
      "commit.verification.signature": "null",
      "commit.verification.verified": "false",
      "committer.avatar_url": commit.committer!.avatar_url!,
      "committer.events_url": commit.committer!.events_url!,
      "committer.followers_url": commit.committer!.followers_url!,
      "committer.following_url": commit.committer!.following_url!,
      "committer.gists_url": commit.committer!.gists_url!,
      "committer.gravatar_id": "",
      "committer.html_url": commit.committer!.html_url!,
      "committer.id": "1",
      "committer.login": commit.committer!.login!,
      "committer.node_id": commit.committer!.node_id!,
      "committer.organizations_url": commit.committer!.organizations_url!,
      "committer.received_events_url": commit.committer!.received_events_url!,
      "committer.repos_url": commit.committer!.repos_url!,
      "committer.site_admin": "false",
      "committer.starred_url": commit.committer!.starred_url!,
      "committer.subscriptions_url": commit.committer!.subscriptions_url!,
      "committer.type": commit.committer!.type!,
      "committer.url": commit.committer!.url!,
      "html_url": commit.html_url,
      "node_id": commit.node_id,
      "parents": commit.parents.map((el) => JSON.stringify(el)).join(", "),
      "sha": commit.sha,
      "url": commit.url,
    }])
  })
})
