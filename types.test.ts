import { assert, Has, IsExact, NotHas } from "dev:conditional-type-checks";

import { Tail, ToTuple, WithOptional, WithRequired } from "./types.ts";

Deno.test("ToTuple", async (t) => {
  await t.step("extracts an object's keys into a constant array type", () => {
    type Keys = ToTuple<keyof { foo: string; bar: number }>;

    assert<Has<Keys, ["foo", "bar"]>>(true);
    assert<NotHas<Keys, ["baz"]>>(true);
  });
});

Deno.test("Tail", async (t) => {
  await t.step("strips the first type", () => {
    assert<IsExact<Tail<["foo"]>, []>>(true);
    assert<IsExact<Tail<["foo", "bar"]>, ["bar"]>>(true);
    assert<IsExact<Tail<["foo", "bar", "baz"]>, ["bar", "baz"]>>(true);
  });
});

Deno.test("WithRequired", async (t) => {
  await t.step("requires a specified property", () => {
    assert<IsExact<WithRequired<{ foo?: "foo"; bar?: "bar" }, "foo">, { foo: "foo"; bar?: "bar" }>>(true);
  });
});

Deno.test("WithOptional", async (t) => {
  await t.step("makes a specified property optional", () => {
    assert<IsExact<WithOptional<{ foo: "foo"; bar: "bar" }, "foo">, { foo?: "foo"; bar: "bar" }>>(true);
  });
});
