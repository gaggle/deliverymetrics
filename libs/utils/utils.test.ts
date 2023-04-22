import { assertEquals, assertRejects, assertThrows } from "dev:asserts"
import { FakeTime } from "dev:time"

import { getFakePull } from "../github/testing.ts"
import { withFakeTime } from "../dev-utils.ts"
import { AbortError } from "../errors.ts"

import {
  arraySubtract,
  arrayToAsyncGenerator,
  asyncSingle,
  asyncToArray,
  first,
  getEnv,
  hasDupes,
  last,
  limit,
  mapFilter,
  mapIter,
  mergeAsyncGenerators,
  pluralize,
  regexIntersect,
  single,
  sleep,
  stringifyPull,
  stringifyUpdatedPull,
  throttle,
} from "./utils.ts"
import { assert, IsExact } from "dev:conditional-type-checks"

Deno.test("asyncToArray", async (t) => {
  await t.step("converts AsyncGenerator", async () => {
    async function* yielder(): AsyncGenerator<string> {
      yield "foo"
    }

    assertEquals(await asyncToArray(yielder()), ["foo"])
  })

  await t.step("converts AsyncIterable", async () => {
    async function* yielder(): AsyncIterable<string> {
      yield "foo"
    }

    assertEquals(await asyncToArray(yielder()), ["foo"])
  })
})

Deno.test("limit", async (t) => {
  await t.step("limits AsyncGenerator", async () => {
    async function* yielder(): AsyncGenerator<string> {
      while (true) {
        yield "foo"
      }
    }

    assertEquals(await asyncToArray(limit(yielder(), 2)), [
      "foo",
      "foo",
    ])
  })

  await t.step("limits AsyncIterable", async () => {
    async function* yielder(): AsyncIterable<string> {
      while (true) {
        yield "foo"
      }
    }

    assertEquals(await asyncToArray(limit(yielder(), 2)), [
      "foo",
      "foo",
    ])
  })
})

Deno.test("first", async (t) => {
  await t.step("yields first element of an AsyncGenerator", async () => {
    async function* yielder(): AsyncGenerator<string> {
      yield "foo"
      yield "bar"
    }

    assertEquals(await first(yielder()), "foo")
  })
})

Deno.test("last", async (t) => {
  await t.step("yields last element of an AsyncGenerator", async () => {
    async function* yielder(): AsyncGenerator<string> {
      yield "foo"
      yield "bar"
    }

    assertEquals(await last(yielder()), "bar")
  })
})

Deno.test("single", async (t) => {
  await t.step("given a Generator", async (t) => {
    await t.step("yields the only element", () => {
      function* yielder(): Generator<string> {
        yield "foo"
      }

      assertEquals(single(yielder()), "foo")
    })

    await t.step("throws if more elements are available", () => {
      function* yielder(): Generator<string> {
        yield "foo"
        yield "bar"
      }

      assertThrows(() => single(yielder()), Error, "too many")
    })

    await t.step("throws if no elements are available", () => {
      function* yielder(): Generator<string> {
      }

      assertThrows(() => single(yielder()), Error, "not enough")
    })
  })

  await t.step("given an Array", async (t) => {
    await t.step("yields the only element", () => {
      assertEquals(single(["foo"]), "foo")
    })

    await t.step("throws if more elements are available", () => {
      assertThrows(() => single(["foo", "bar"]), Error, "too many")
    })

    await t.step("throws if no elements are available", () => {
      assertThrows(() => single([]), Error, "not enough")
    })
  })
})

Deno.test("asyncSingle", async (t) => {
  await t.step("given an AsyncGenerator", async (t) => {
    await t.step("yields the only element", async () => {
      async function* yielder(): AsyncGenerator<string> {
        yield "foo"
      }

      assertEquals(await asyncSingle(yielder()), "foo")
    })

    await t.step("throws if more elements are available", async () => {
      async function* yielder(): AsyncGenerator<string> {
        yield "foo"
        yield "bar"
      }

      await assertRejects(() => asyncSingle(yielder()), Error, "too many")
    })

    await t.step("throws if no elements are available", async () => {
      async function* yielder(): AsyncGenerator<string> {
      }

      await assertRejects(() => asyncSingle(yielder()), Error, "not enough")
    })
  })

  await t.step("given an Array", async (t) => {
    await t.step("yields the only element", async () => {
      assertEquals(await asyncSingle(["foo"]), "foo")
    })

    await t.step("throws if more elements are available", async () => {
      await assertRejects(() => asyncSingle(["foo", "bar"]), Error, "too many")
    })

    await t.step("throws if no elements are available", async () => {
      await assertRejects(() => asyncSingle([]), Error, "not enough")
    })
  })
})

Deno.test("sleep", async (t) => {
  await t.step("trivially sleeps", async () => {
    await sleep(1)
  })

  await t.step("can be aborted", async () => {
    const signal = AbortSignal.timeout(1)
    await assertRejects(() => sleep(50_000, { signal }), AbortError)
  })
})

Deno.test("getEnv", async (t) => {
  const originalValue = Deno.env.get("foo")

  await t.step("gets an env", () => {
    Deno.env.set("foo", "bar")

    try {
      assertEquals(getEnv("foo"), "bar")
    } finally {
      originalValue ? Deno.env.set("foo", originalValue) : Deno.env.delete("foo")
    }
  })

  await t.step("throws if env is missing", () => {
    Deno.env.delete("foo")

    try {
      assertThrows(
        () => getEnv("foo"),
        Error,
        "Required environment variable missing: foo",
      )
    } finally {
      originalValue ? Deno.env.set("foo", originalValue) : Deno.env.delete("foo")
    }
  })
})

Deno.test("pluralize", async (t) => {
  const pluralizationData = {
    plural: () => "plural",
    singular: () => "singular",
    empty: () => "empty",
  }

  await t.step("pluralizes multiple elements", () => {
    assertEquals(
      pluralize(["a", "b", "c"], pluralizationData),
      "plural",
    )
  })

  await t.step("chooses singular for one element", () => {
    assertEquals(pluralize(["a"], pluralizationData), "singular")
  })

  await t.step("chooses empty when collection is empty", () => {
    assertEquals(pluralize([], pluralizationData), "empty")
  })
})

Deno.test("stringifyPull", async (t) => {
  await t.step("makes a nice string", () => {
    assertEquals(
      stringifyPull(getFakePull({
        _links: { html: { href: "https://url" } },
        number: 1,
        state: "open",
      })),
      "#1 (open) https://url",
    )
  })

  await t.step("understands draft mode", () => {
    assertEquals(
      stringifyPull(getFakePull({
        _links: { html: { href: "https://url" } },
        draft: true,
        number: 1,
        state: "open",
      })),
      "#1 (draft) https://url",
    )
  })
})

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
    )
  })

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
    )
  })

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
  )
})

Deno.test("mapIter", async (t) => {
  await t.step("maps over an iterator", async () => {
    const iter = await mapIter((el) => el * 2, arrayToAsyncGenerator([1, 2, 3]))
    assertEquals(await asyncToArray(iter), [2, 4, 6])
  })
})

Deno.test("throttle", async (t) => {
  await t.step("invokes function on leading edge", async () => {
    let count = 0
    const wrappedFn = throttle(() => count++, 50)

    await withFakeTime(async (fakeTime) => {
      await wrappedFn()
      await fakeTime.tickAsync(1)
    }, new FakeTime(0))

    assertEquals(count, 1)
  })

  await t.step("drops call within `wait` window", async () => {
    let count = 0
    const wrappedFn = throttle(() => count++, 50)

    await withFakeTime(async (fakeTime) => {
      await wrappedFn()
      await fakeTime.tickAsync(48)
      await wrappedFn()
      await fakeTime.tickAsync(1)
      await wrappedFn()
      await fakeTime.tickAsync(1)
    }, new FakeTime(0))

    assertEquals(count, 2)
  })

  await t.step("invokes if called after `wait` window", async () => {
    let count = 0
    const wrappedFn = throttle(() => count++, 50)

    await withFakeTime(async (fakeTime) => {
      await wrappedFn()
      await fakeTime.tickAsync(50)
      await wrappedFn()
      await fakeTime.tickAsync(1000)
    }, new FakeTime(0))

    assertEquals(count, 2)
  })

  await t.step("calls at most every `wait` delay", async () => {
    const actual: Array<number> = []
    const wrappedFn = throttle(() => {
      actual.push(Date.now())
    }, 50)

    await withFakeTime(async (fakeTime) => {
      await wrappedFn()
      await fakeTime.tickAsync(25)
      await wrappedFn()
      await fakeTime.tickAsync(25)
      await wrappedFn()
      await fakeTime.tickAsync(25)
      await wrappedFn()
      await fakeTime.tickAsync(25)
      await wrappedFn()
      await fakeTime.tickAsync(25)
      await wrappedFn()
      await fakeTime.tickAsync(1000)
    }, new FakeTime(0))

    assertEquals(actual, [0, 50, 100, 150])
  })
})

Deno.test("regexIntersect", async (t) => {
  await t.step("finds simple intersection", () => {
    assertEquals(regexIntersect(["foo", "bar", "baz"], ["foo"]), ["foo"])
  })

  await t.step("finds intersection from strings", () => {
    assertEquals(regexIntersect(["foo", "bar", "baz"], ["foo", "baz"], ["baz"]), ["baz"])
  })

  const regexes = [/foo/, /fo.$/]
  for (const r of regexes) {
    await t.step(`finds intersection from regex ${r}`, () => {
      assertEquals(regexIntersect(["foo", "bar"], [r]), ["foo"])
    })
  }

  await t.step("finds intersection from a mix", () => {
    assertEquals(regexIntersect(["foo", "bar", "baz"], ["foo", /baz/]), ["foo", "baz"])
  })
})

Deno.test("getDupes", async (t) => {
  await t.step("returns trivial dupes", () => {
    assertEquals(hasDupes([1, 1]), true)
  })

  await t.step("returns dupes", () => {
    assertEquals(hasDupes(["foo", "bar", "foo"]), true)
  })

  await t.step("returns complex duping", () => {
    assertEquals(hasDupes(["foo", "bar", "foo", "bar", "bar"]), true)
  })

  await t.step("returns empty if no dupes exist", () => {
    assertEquals(hasDupes(["foo", "bar", "baz"]), false)
  })
})

Deno.test("mapFilter", async (t) => {
  await t.step("filters away undefined", () => {
    const mapFiltered = mapFilter([{ name: "foo" }, { name: "bar" }], (el) => el.name === "foo" ? el : undefined)
    assertEquals(mapFiltered, [{ name: "foo" }])
  })
})

Deno.test("arraySubtract", async (t) => {
  await t.step("subtracts trivial arrays", () => {
    assertEquals(arraySubtract([1, 2, 3], [1]), [2, 3])
  })

  await t.step("subtracts arrays", () => {
    assertEquals(arraySubtract(["foo", "bar", "baz"], ["foo", "baz"]), ["bar"])
  })

  await t.step("subtracts complex arrays", () => {
    assertEquals(arraySubtract(["foo", "bar", "baz", "foo", "bar"], ["foo", "baz"]), ["bar", "bar"])
  })

  await t.step("subtracts types", () => {
    const result = arraySubtract([1, 2, 3] as const, [1] as const)
    assert<IsExact<typeof result, [2, 3]>>(true)
  })
})

Deno.test("mergeAsyncGenerators", async (t) => {
  await t.step("merges trivial generators", async () => {
    const gen1 = async function* () {
      yield 1
    }
    const gen2 = async function* () {
      yield 2
    }
    const merged = mergeAsyncGenerators(gen1(), gen2())
    const result = []
    for await (const el of merged) {
      result.push(el)
    }
    assertEquals(result, [1, 2])
  })
})
