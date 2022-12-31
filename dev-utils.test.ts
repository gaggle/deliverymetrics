import { assertEquals } from "dev:asserts";
import { stub } from "dev:mock";

import { withStubs } from "./dev-utils.ts";

Deno.test("withStubs", async (t) => {
  const foo = { bar: () => "baz" };

  await t.step("passes the provided stubs into the callable", () => {
    withStubs((stub) => {
      assertEquals(stub(), "ham");
    }, stub(foo, "bar", () => "ham"));
  });
});
