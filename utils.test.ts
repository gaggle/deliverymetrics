import { assertEquals, assertThrows } from "dev:asserts";
import { FakeTime } from "dev:time";

import { getFakePull } from "./github/testing.ts";

import {
  asyncToArray,
  first,
  getEnv,
  last,
  limit,
  pluralize,
  regexIntersect,
  stringifyPull,
  stringifyUpdatedPull,
  throttle,
} from "./utils.ts";
import { withFakeTime } from "./dev-utils.ts";

Deno.test("asyncToArray", async (t) => {
  await t.step("converts AsyncGenerator", async () => {
    async function* yielder(): AsyncGenerator<string> {
      yield "foo";
    }

    assertEquals(await asyncToArray(yielder()), ["foo"]);
  });

  await t.step("converts AsyncIterable", async () => {
    async function* yielder(): AsyncIterable<string> {
      yield "foo";
    }

    assertEquals(await asyncToArray(yielder()), ["foo"]);
  });
});

Deno.test("limit", async (t) => {
  await t.step("limits AsyncGenerator", async () => {
    async function* yielder(): AsyncGenerator<string> {
      while (true) {
        yield "foo";
      }
    }

    assertEquals(await asyncToArray(limit(yielder(), 2)), [
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

    assertEquals(await asyncToArray(limit(yielder(), 2)), [
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

    assertEquals(await first(yielder()), "foo");
  });
});

Deno.test("last", async (t) => {
  await t.step("yields last element of an AsyncGenerator", async () => {
    async function* yielder(): AsyncGenerator<string> {
      yield "foo";
      yield "bar";
    }

    assertEquals(await last(yielder()), "bar");
  });
});

Deno.test("getEnv", async (t) => {
  const originalValue = Deno.env.get("foo");

  await t.step("gets an env", () => {
    Deno.env.set("foo", "bar");

    try {
      assertEquals(getEnv("foo"), "bar");
    } finally {
      originalValue ? Deno.env.set("foo", originalValue) : Deno.env.delete("foo");
    }
  });

  await t.step("throws if env is missing", () => {
    Deno.env.delete("foo");

    try {
      assertThrows(
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
    assertEquals(
      pluralize(["a", "b", "c"], pluralizationData),
      "plural",
    );
  });

  await t.step("chooses singular for one element", () => {
    assertEquals(pluralize(["a"], pluralizationData), "singular");
  });

  await t.step("chooses empty when collection is empty", () => {
    assertEquals(pluralize([], pluralizationData), "empty");
  });
});

Deno.test("stringifyPull", async (t) => {
  await t.step("makes a nice string", () => {
    assertEquals(
      stringifyPull(getFakePull({
        _links: { html: { href: "https://url" } },
        number: 1,
        state: "open",
      })),
      "#1 (open) https://url",
    );
  });

  await t.step("understands draft mode", () => {
    assertEquals(
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
    assertEquals(
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
    assertEquals(
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

  assertEquals(
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

Deno.test("throttle", async (t) => {
  await t.step("invokes function on leading edge", async () => {
    let count = 0;
    const wrappedFn = throttle(() => count++, 50);

    await withFakeTime(async (fakeTime) => {
      await wrappedFn();
      await fakeTime.tickAsync(1);
    }, new FakeTime(0));

    assertEquals(count, 1);
  });

  await t.step("drops call within `wait` window", async () => {
    let count = 0;
    const wrappedFn = throttle(() => count++, 50);

    await withFakeTime(async (fakeTime) => {
      await wrappedFn();
      await fakeTime.tickAsync(48);
      await wrappedFn();
      await fakeTime.tickAsync(1);
      await wrappedFn();
      await fakeTime.tickAsync(1);
    }, new FakeTime(0));

    assertEquals(count, 2);
  });

  await t.step("invokes if called after `wait` window", async () => {
    let count = 0;
    const wrappedFn = throttle(() => count++, 50);

    await withFakeTime(async (fakeTime) => {
      await wrappedFn();
      await fakeTime.tickAsync(50);
      await wrappedFn();
      await fakeTime.tickAsync(1000);
    }, new FakeTime(0));

    assertEquals(count, 2);
  });

  await t.step("calls at most every `wait` delay", async () => {
    const actual: Array<number> = [];
    const wrappedFn = throttle(() => {
      actual.push(Date.now());
    }, 50);

    await withFakeTime(async (fakeTime) => {
      await wrappedFn();
      await fakeTime.tickAsync(25);
      await wrappedFn();
      await fakeTime.tickAsync(25);
      await wrappedFn();
      await fakeTime.tickAsync(25);
      await wrappedFn();
      await fakeTime.tickAsync(25);
      await wrappedFn();
      await fakeTime.tickAsync(25);
      await wrappedFn();
      await fakeTime.tickAsync(1000);
    }, new FakeTime(0));

    assertEquals(actual, [0, 50, 100, 150]);
  });
});

Deno.test("regexIntersect", async (t) => {
  await t.step("finds simple intersection", () => {
    assertEquals(regexIntersect(["foo", "bar", "baz"], ["foo"]), ["foo"]);
  });

  await t.step("finds intersection from strings", () => {
    assertEquals(regexIntersect(["foo", "bar", "baz"], ["foo", "baz"], ["baz"]), ["baz"]);
  });

  const regexes = [/foo/, /fo.$/];
  for (const r of regexes) {
    await t.step(`finds intersection from regex ${r}`, () => {
      assertEquals(regexIntersect(["foo", "bar"], [r]), ["foo"]);
    });
  }

  await t.step("finds intersection from a mix", () => {
    assertEquals(regexIntersect(["foo", "bar", "baz"], ["foo", /baz/]), ["foo", "baz"]);
  });
});
