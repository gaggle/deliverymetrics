import { typeChecks } from "./dev-deps.ts";
import { Tail, ToTuple } from "./types.ts";

Deno.test("ToTuple", async (t) => {
  await t.step("extracts an object's keys into a constant array type", () => {
    type Keys = ToTuple<keyof { foo: string; bar: number }>;

    typeChecks.assert<typeChecks.IsExact<Keys, ["foo", "bar"]>>(true);
    typeChecks.assert<typeChecks.IsExact<Keys, ["foo"]>>(false);
    typeChecks.assert<typeChecks.IsExact<Keys, ["foo", "baz"]>>(false);
    typeChecks.assert<typeChecks.IsExact<Keys, ["foo", "bar", "baz"]>>(false);
  });
});

Deno.test("Tail", async (t) => {
  await t.step("strips the first type", () => {
    typeChecks.assert<typeChecks.IsExact<Tail<["foo"]>, []>>(true);
    typeChecks.assert<typeChecks.IsExact<Tail<["foo", "bar"]>, ["bar"]>>(true);
    typeChecks.assert<
      typeChecks.IsExact<Tail<["foo", "bar", "baz"]>, ["bar", "baz"]>
    >(true);
  });
});
