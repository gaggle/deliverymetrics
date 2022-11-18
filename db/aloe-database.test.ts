import { asserts, } from "../dev-deps.ts";
import { z, } from "../deps.ts";

import { AloeDatabase } from "./aloe-database.ts";

Deno.test("AloeDatabase", async (t) => {
  await t.step("#count", async () => {
    const db = await AloeDatabase.new({ path: undefined, schema: z.object({ name: z.string() }) });
    await db.insertOne({ name: "foo" });
    const result = await db.count();
    asserts.assertEquals(result, 1);
  });

  await t.step("#findOne", async () => {
    const db = await AloeDatabase.new({ path: undefined, schema: z.object({ name: z.string() }) });
    await db.insertMany([{ name: "foo" }, { name: "bar" }]);
    const result = await db.findOne({ name: "bar" });
    asserts.assertEquals(result, { name: "bar" });
  });

  await t.step("#insertOne", async () => {
    const db = await AloeDatabase.new({ path: undefined, schema: z.object({ name: z.string() }) });
    const result = await db.insertOne({ name: "foo" });
    asserts.assertEquals(result, { name: "foo" });
  });
});
