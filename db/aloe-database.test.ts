import * as z from "zod";
import { assertEquals } from "dev:asserts";

import { AloeDatabase, MockAloeDatabase } from "./aloe-database.ts";

Deno.test("AloeDatabase", async (t) => {
  await t.step("#count", async () => {
    const db = await AloeDatabase.new({
      path: undefined,
      schema: z.object({ name: z.string() }),
    });
    await db.insertOne({ name: "foo" });
    const result = await db.count();
    assertEquals(result, 1);
  });

  await t.step("#findOne", async () => {
    const db = await AloeDatabase.new({
      path: undefined,
      schema: z.object({ name: z.string() }),
    });
    await db.insertMany([{ name: "foo" }, { name: "bar" }]);
    const result = await db.findOne({ name: "bar" });
    assertEquals(result, { name: "bar" });
  });

  await t.step("#insertOne", async () => {
    const db = await AloeDatabase.new({
      path: undefined,
      schema: z.object({ name: z.string() }),
    });
    const result = await db.insertOne({ name: "foo" });
    assertEquals(result, { name: "foo" });
  });
});

Deno.test("MockAloeDatabase", async (t) => {
  await t.step("can be created", async () => {
    const db = await MockAloeDatabase.new({
      schema: z.object({ name: z.string() }),
    });
    assertEquals(await db.findMany(), []);
  });

  await t.step("can be pre-populated with docs", async () => {
    const db = await MockAloeDatabase.new({
      schema: z.object({ name: z.string() }),
      documents: [{ name: "Foo" }],
    });
    assertEquals(await db.findMany(), [{ name: "Foo" }]);
  });
});
