import { asserts } from "../dev-deps.ts";

import { parseGithubUrl as parse } from "./parse-github-url.ts";

Deno.test("parseGithubUrl", async (t) => {
  for (
    const url of [
      "owner/repo",
      "OWNER/repo",
    ]
  ) {
    await t.step(`should parse simple id: '${url}'`, () => {
      asserts.assertEquals(parse(url), { owner: "owner", repo: "repo" });
    });
  }

  await t.step("should parse simple id: 'my.owner/repo'", function () {
    asserts.assertEquals(parse("my.owner/repo"), {
      owner: "my.owner",
      repo: "repo",
    });
  });

  for (
    const url of [
      // Browser urls
      "https://github.com/owner/repo",
      "https://www.github.com/owner/repo",
      "http://www.github.com/owner/repo",

      // Code dropdown
      "git@github.com:owner/repo.git", // SSH tab
      "https://github.com/owner/repo.git", // HTTPS tab
    ]
  ) {
    await t.step(`should parse url: '${url}'`, () => {
      asserts.assertEquals(parse(url), {
        owner: "owner",
        repo: "repo",
      });
    });
  }

  await t.step(
    "should parse url: 'https://github.com/my.owner/repo'",
    function () {
      asserts.assertEquals(parse("https://github.com/my.owner/repo"), {
        owner: "my.owner",
        repo: "repo",
      });
    },
  );
});
