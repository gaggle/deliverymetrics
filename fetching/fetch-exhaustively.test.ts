import { asserts } from "../dev-deps.ts";
import { asyncToArray } from "../utils.ts";
import { withMockedFetch } from "../dev-utils.ts";
import { fetchExhaustively, parseLink } from "./fetch-exhaustively.ts";

Deno.test("parseLink", async (t) => {
  await t.step("parses a Github-styled Link header", () => {
    const parsed = parseLink(
      `<https://next>; rel="next", <https://last>; rel="last"`,
    );
    asserts.assertEquals(parsed, {
      last: "https://last",
      next: "https://next",
    });
  });
});

Deno.test("fetchExhaustively", async (t) => {
  await t.step("fetches once for a simple endpoint", async () => {
    await withMockedFetch(async (mf) => {
      mf.mock("GET@/pulls", () => new Response("foo", { status: 200 }));
      const responses = await asyncToArray(
        fetchExhaustively(new Request("https://x/pulls")),
      );
      asserts.assertEquals(
        await Promise.all(responses.map((resp) => resp.text())),
        ["foo"],
      );
    });
  });

  await t.step(
    "fetches thrice to exhaust a three-paginated endpoint",
    async () => {
      await withMockedFetch(async (mf) => {
        mf.mock("GET@/pulls", (req) => {
          const pageQuery = new URL(req.url).searchParams.get("page");
          switch (pageQuery) {
            case null:
              return new Response("foo", {
                status: 200,
                headers: {
                  link:
                    `<https://x/pulls?page=2>; rel="next", <https://x/pulls?page=3>; rel="last"`,
                },
              });
            case "2":
              return new Response("bar", {
                status: 200,
                headers: {
                  link:
                    `<https://x/pulls?page=3>; rel="next", <https://x/pulls?page=3>; rel="last"`,
                },
              });
            case "3":
              return new Response("baz", { status: 200 });
          }
          throw new Error(`Unregistered fetch: ${pageQuery}`);
        });
        const request = new Request("https://x/pulls");
        const responses = await asyncToArray(fetchExhaustively(request));
        const bodies = await Promise.all(responses.map((resp) => resp.text()));
        asserts.assertEquals(bodies, ["foo", "bar", "baz"]);
      });
    },
  );

  await t.step(
    "fetchExhaustively fetches once if endpoint has a Link header with no next link",
    async () => {
      await withMockedFetch(async (mf) => {
        mf.mock("GET@/pulls", () => {
          return new Response("foo", {
            status: 200,
            headers: {
              link:
                `<https://x/pulls?page=2>; rel="foo", <https://x/pulls?page=3>; rel="last"`,
            },
          });
        });
        const request = new Request("https://x/pulls");
        const responses = await asyncToArray(fetchExhaustively(request));
        const bodies = await Promise.all(responses.map((resp) => resp.text()));
        asserts.assertEquals(bodies, ["foo"]);
      });
    },
  );
});
