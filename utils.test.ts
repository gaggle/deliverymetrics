import { getFakePull } from "./github/testing.ts";

import { asserts } from "./dev-deps.ts";
import { asyncToArray, first, getEnv, last, limit, pluralize, stringifyPull, stringifyUpdatedPull } from "./utils.ts";

Deno.test("asyncToArray", async (t) => {
  await t.step("converts AsyncGenerator", async () => {
    async function* yielder(): AsyncGenerator<string> {
      yield "foo";
    }

    asserts.assertEquals(await asyncToArray(yielder()), ["foo"]);
  });

  await t.step("converts AsyncIterable", async () => {
    async function* yielder(): AsyncIterable<string> {
      yield "foo";
    }

    asserts.assertEquals(await asyncToArray(yielder()), ["foo"]);
  });
});

Deno.test("limit", async (t) => {
  await t.step("limits AsyncGenerator", async () => {
    async function* yielder(): AsyncGenerator<string> {
      while (true) {
        yield "foo";
      }
    }

    asserts.assertEquals(await asyncToArray(limit(yielder(), 2)), [
      "foo",
      "foo",
    ]);
  });

  await t.step("limits AsyncIterable", async () => {
    async function* yielder(): AsyncIterable<string> {
      while (true) {
        yield "foo";
      }
    }

    asserts.assertEquals(await asyncToArray(limit(yielder(), 2)), [
      "foo",
      "foo",
    ]);
  });
});

Deno.test("first", async (t) => {
  await t.step("yields first element of an AsyncGenerator", async () => {
    async function* yielder(): AsyncGenerator<string> {
      yield "foo";
      yield "bar";
    }

    asserts.assertEquals(await first(yielder()), "foo");
  });
});

Deno.test("last", async (t) => {
  await t.step("yields last element of an AsyncGenerator", async () => {
    async function* yielder(): AsyncGenerator<string> {
      yield "foo";
      yield "bar";
    }

    asserts.assertEquals(await last(yielder()), "bar");
  });
});

Deno.test("getEnv", async (t) => {
  const originalValue = Deno.env.get("foo");

  await t.step("gets an env", () => {
    Deno.env.set("foo", "bar");

    try {
      asserts.assertEquals(getEnv("foo"), "bar");
    } finally {
      originalValue ? Deno.env.set("foo", originalValue) : Deno.env.delete("foo");
    }
  });

  await t.step("throws if env is missing", () => {
    Deno.env.delete("foo");

    try {
      asserts.assertThrows(
        () => getEnv("foo"),
        Error,
        "Required environment variable missing: foo",
      );
    } finally {
      originalValue ? Deno.env.set("foo", originalValue) : Deno.env.delete("foo");
    }
  });
});

Deno.test("pluralize", async (t) => {
  const pluralizationData = {
    plural: () => "plural",
    singular: () => "singular",
    empty: () => "empty",
  };

  await t.step("pluralizes multiple elements", () => {
    asserts.assertEquals(
      pluralize(["a", "b", "c"], pluralizationData),
      "plural",
    );
  });

  await t.step("chooses singular for one element", () => {
    asserts.assertEquals(pluralize(["a"], pluralizationData), "singular");
  });

  await t.step("chooses empty when collection is empty", () => {
    asserts.assertEquals(pluralize([], pluralizationData), "empty");
  });
});

Deno.test("stringifyPull", async (t) => {
  await t.step("makes a nice string", () => {
    asserts.assertEquals(
      stringifyPull(getFakePull({
        _links: { html: { href: "https://url" } },
        number: 1,
        state: "open",
      })),
      "#1 (open) https://url",
    );
  });

  await t.step("understands draft mode", () => {
    asserts.assertEquals(
      stringifyPull(getFakePull({
        _links: { html: { href: "https://url" } },
        draft: true,
        number: 1,
        state: "open",
      })),
      "#1 (draft) https://url",
    );
  });
});

Deno.test("stringifyUpdatedPull", async (t) => {
  await t.step("makes a nice string", () => {
    asserts.assertEquals(
      stringifyUpdatedPull({
        prev: getFakePull({
          _links: { html: { href: "https://url" } },
          number: 1,
          state: "open",
        }),
        updated: getFakePull({
          _links: { html: { href: "https://url" } },
          number: 1,
          state: "closed",
        }),
      }),
      "#1 (open -> closed) https://url",
    );
  });

  await t.step("understands draft mode", () => {
    asserts.assertEquals(
      stringifyUpdatedPull({
        prev: getFakePull({
          _links: { html: { href: "https://url" } },
          draft: true,
          number: 1,
          state: "open",
        }),
        updated: getFakePull({
          _links: { html: { href: "https://url" } },
          number: 1,
          state: "closed",
        }),
      }),
      "#1 (draft -> closed) https://url",
    );
  });

  asserts.assertEquals(
    stringifyUpdatedPull({
      prev: getFakePull({
        _links: { html: { href: "https://url" } },
        number: 1,
        state: "open",
      }),
      updated: getFakePull({
        _links: { html: { href: "https://url" } },
        draft: true,
        number: 1,
        state: "open",
      }),
    }),
    "#1 (open -> draft) https://url",
  );
});
