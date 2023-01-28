import { AssertTrue, IsExact } from "dev:conditional-type-checks";

import { Tail, ToTuple, WithOptional, WithRequired } from "./types.ts";

type _ =
  // ToTuple
  | AssertTrue<IsExact<ToTuple<keyof { foo: string; bar: number }>, ["foo", "bar"]>>
  // Tail
  | AssertTrue<IsExact<Tail<["foo"]>, []>>
  | AssertTrue<IsExact<Tail<["foo", "bar"]>, ["bar"]>>
  | AssertTrue<IsExact<Tail<["foo", "bar", "baz"]>, ["bar", "baz"]>>
  // WithRequired
  | IsExact<WithRequired<{ foo?: "foo"; bar?: "bar" }, "foo">, { foo: "foo"; bar?: "bar" }>
  // WithOptional
  | IsExact<WithOptional<{ foo: "foo"; bar: "bar" }, "foo">, { foo?: "foo"; bar: "bar" }>;
