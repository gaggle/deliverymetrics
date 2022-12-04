import { assertEquals, assertRejects } from "dev:asserts";
import { assertSpyCalls, returnsNext, stub } from "dev:mock";

import { Retrier } from "../../fetching/mod.ts";

import { asyncToArray } from "../../utils.ts";
import { withStubs } from "../../dev-utils.ts";

import { getFakePullCommit } from "../testing.ts";

import { fetchPullCommits } from "./fetch-pull-commits.ts";

Deno.test("fetchPullCommits", async (t) => {
  await t.step("should call fetch to get pull-commits from GitHub API", async () => {
    const retrier = new Retrier();
    await withStubs(
      async (stub) => {
        await asyncToArray(fetchPullCommits({ commits_url: "https://foo" }, "token", { retrier }));

        assertSpyCalls(stub, 1);
        const request = stub.calls[0].args["0"] as Request;
        assertEquals(request.method, "GET");
        assertEquals(request.url, "https://foo/",);
        assertEquals(Array.from(request.headers.entries()), [
          ["accept", "Accept: application/vnd.github.v3+json"],
          ["authorization", "Bearer token"],
          ["content-type", "application/json"],
        ]);
      },
      stub(
        retrier,
        "fetch",
        returnsNext([Promise.resolve(
          new Response(JSON.stringify([getFakePullCommit()]), {
            status: 200,
            statusText: "OK",
          }),
        )]),
      ),
    );
  });

  await t.step("should yield the pulls that get fetched", async () => {
    const retrier = new Retrier();
    await withStubs(
      async () => {
        const res = await asyncToArray(fetchPullCommits({ commits_url: "https://foo" }, "token", { retrier }));
        assertEquals(res, [getFakePullCommit()]);
      },
      stub(
        retrier,
        "fetch",
        returnsNext([Promise.resolve(
          new Response(JSON.stringify([getFakePullCommit()]), {
            status: 200,
            statusText: "OK",
          }),
        )]),
      ),
    );
  });

  await t.step("should use Link header to fetch exhaustively", async () => {
    const retrier = new Retrier();
    await withStubs(
      async (stub) => {
        await asyncToArray(fetchPullCommits({ commits_url: "https://foo" }, "token", { retrier }));

        assertSpyCalls(stub, 3);
        // ↑ Called thrice because it fetches pages 2 & 3
        assertEquals(
          stub.calls[0].args["0"].url,
          "https://foo/",
        );
        assertEquals(
          stub.calls[1].args["0"].url,
          "https://foo/?page=2",
        );
        assertEquals(
          stub.calls[2].args["0"].url,
          "https://foo/?page=3",
        );
      },
      stub(
        retrier,
        "fetch",
        returnsNext([
          Promise.resolve(
            new Response(JSON.stringify([getFakePullCommit({ commit: { message: "message 1" } })]), {
              status: 200,
              statusText: "OK",
              headers: new Headers({
                link:
                  "<https://foo?page=2>; rel=\"next\", <https://foo?page=3>; rel=\"last\"",
              }),
            }),
          ),
          Promise.resolve(
            new Response(JSON.stringify([getFakePullCommit({commit: { message: "message 2" }})]), {
              status: 200,
              statusText: "OK",
              headers: new Headers({
                link:
                  "<https://foo?page=3>; rel=\"next\", <https://foo?page=3>; rel=\"last\"",
              }),
            }),
          ),
          Promise.resolve(
            new Response(JSON.stringify([getFakePullCommit({commit: { message: "message 3" }})]), {
              status: 200,
              statusText: "OK",
            }),
          ),
        ]),
      ),
    );
  });

  await t.step("should throw an error if fetch isn't ok", async () => {
    const retrier = new Retrier();
    await withStubs(
      async () => {
        await assertRejects(
          () => asyncToArray(fetchPullCommits({commits_url: "https://foo"}, "token", { retrier })),
          Error,
          "Could not fetch https://foo/, got 404 Not Found: Some error",
        );
      },
      stub(
        retrier,
        "fetch",
        returnsNext([Promise.resolve(
          new Response("Some error", { status: 404, statusText: "Not Found" }),
        )]),
      ),
    );
  });
});
