import { asserts } from "./dev-deps.ts";
import { path, z } from "./deps.ts";

import {
  dirExists,
  ensureFiles,
  ensureJson,
  pathExists,
  readJsonFile,
  safeReadTextFile,
  withTempDir,
  withTempFile
} from "./path-and-file-utils.ts";

const modulePath = path.fromFileUrl(import.meta.url);

Deno.test("pathExists", async (t) => {
  await t.step("is false when path doesn't exist", async () => {
    asserts.assertEquals(await pathExists("./foo-bar-baz.ham"), false);
  });

  await t.step("is true when path exists", async () => {
    asserts.assertEquals(await pathExists(modulePath), true);
  });
});

Deno.test("dirExists", async (t) => {
  await t.step("is false when path doesn't exist", async () => {
    asserts.assertEquals(await pathExists("./foo-bar-baz.ham"), false);
  });

  await t.step("is false when path exists but its not a directory", async () => {
    asserts.assertEquals(await dirExists(modulePath), false);
  });

  await t.step("is true when path exists", async () => {
    asserts.assertEquals(await dirExists(path.dirname(modulePath)), true);
  });
});

Deno.test("safReadTextFile", async (t) => {
  await t.step("is undefined if path doesn't exist", async () => {
    const actual = await safeReadTextFile("./foo-bar-baz.ham");
    asserts.assertEquals(actual, undefined);
  });

  await t.step("returns content of path", async () => {
    const actual = await safeReadTextFile(modulePath);
    asserts.assertMatch(actual!, new RegExp(t.name));
    // ↑ asserts step name exist in this file 😅
  });
});

Deno.test("readJsonFile", async (t) => {
  await t.step("returns content", async () => {
    await withTempFile(async fp => {
      const actual = await readJsonFile(fp, z.object({ foo: z.string() }));
      asserts.assertEquals(actual, { foo: "bar" });
    }, {
      data: JSON.stringify({ "foo": "bar" }),
      suffix: "good.json",
    });
  });

  await t.step("throws when content fails schema", async () => {
    await withTempFile(async fp => {
      await asserts.assertRejects(
        () => readJsonFile(fp, z.object({ foo: z.string() })),
        z.ZodError
      );
    }, {
      suffix: "bad.json",
      data: JSON.stringify({ "foo": 1 })
    });
  });
});

Deno.test("ensureJson", async (t) => {
  const schema = z.object({ foo: z.string() });

  await t.step("can create a json file", async () => {
    await withTempDir(async p => {
      const fp = path.join(p, "a-json-file.json");
      await ensureJson(fp, { schema: z.object({ foo: z.string() }), defaults: { foo: "bar" } });
      asserts.assertEquals(await Deno.readTextFile(fp), JSON.stringify({ foo: "bar" }, null, 2));
    });
  });

  await t.step("creates subfolders as needed", async () => {
    await withTempDir(async p => {
      const fp = path.join(p, "foo/bar/baz/ham.json");
      await ensureJson(fp, { schema: z.object({ foo: z.string() }), defaults: { foo: "bar" } });
      asserts.assertEquals(await Deno.readTextFile(fp), JSON.stringify({ foo: "bar" }, null, 2));
    });
  });

  await t.step("populates an empty file with defaults", async () => {
    await withTempFile(async fp => {
      await ensureJson(fp, { schema: z.object({ foo: z.string() }), defaults: { foo: "bar" } });
      asserts.assertEquals(await Deno.readTextFile(fp), JSON.stringify({ foo: "bar" }, null, 2));
    }, { data: "" });
  });

  await t.step("does nothing if file already exists with schema-valid content", async () => {
    await withTempFile(async fp => {
      await ensureJson(fp, { schema: z.object({ foo: z.string() }), defaults: { foo: "bar" } });
      asserts.assertEquals(await Deno.readTextFile(fp), JSON.stringify({ foo: "ham" }, null, 2));
    }, { data: JSON.stringify({ foo: "ham" }, null, 2) });
  });

  await t.step("rejects if file has non-json content", async () => {
    await withTempFile(async fp => {
      await asserts.assertRejects(() => ensureJson(fp, { schema, defaults: { foo: "bar" } }), SyntaxError);
    }, { data: "oh hi there" });
  });

  await t.step("rejects if file has schema-invalid content", async () => {
    await withTempFile(async fp => {
      await asserts.assertRejects(() => ensureJson(fp, { schema, defaults: { foo: "bar" } }), z.ZodError);
    }, { data: JSON.stringify({ ham: "spam" }, null, 2) });
  });
});

Deno.test("ensureFiles", async (t) => {
  await t.step("returns absolute file-paths", async () => {
    await withTempDir(async (p) => {
      const result = await ensureFiles(p, [{ file: "foo.txt", data: "foo" }]);
      asserts.assertEquals(result, [path.join(p, "foo.txt")]);
    });
  });

  await t.step("creates a simple file", async () => {
    await withTempDir(async (p) => {
      await ensureFiles(p, [{ file: "foo.txt", data: "foo" }]);
      asserts.assertEquals(await Deno.readTextFile(path.join(p, "foo.txt")), "foo");
    });
  });

  await t.step("creates json content from an object", async () => {
    await withTempDir(async (p) => {
      await ensureFiles(p, [{ file: "foo.txt", data: { foo: "bar" } }]);
      asserts.assertEquals(await Deno.readTextFile(path.join(p, "foo.txt")), JSON.stringify({ foo: "bar" }, null, 2));
    });
  });

  await t.step("blocks files being made outside root", async () => {
    await withTempDir(async (p) => {
      await asserts.assertRejects(
        () => ensureFiles(p, [{ file: "../foo.txt", data: "foo" }]), Error,
        `File ${path.resolve(path.join(p, "..", "foo.txt"))} must be inside root ${p}`);
    });
  });

  await t.step("creates folders for a subfoldered file", async () => {
    await withTempDir(async (p) => {
      await ensureFiles(p, [{ file: "foo/bar/baz/ham/spam/eggs/bacon.txt", data: "foo" }]);
      asserts.assertEquals(await Deno.readTextFile(path.join(p, "foo/bar/baz/ham/spam/eggs/bacon.txt")), "foo");
    });
  });
});
