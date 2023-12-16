import { assertEquals, assertInstanceOf, assertRejects, assertThrows } from "dev:asserts"
import { FakeTime } from "dev:time"
import { Logger } from "std:log"
import { z } from "zod"

import { withFakeTime } from "./dev-utils.ts"
import { AbortError } from "./errors.ts"
import {
  arrayToAsyncGenerator,
  asyncMapIter,
  asyncSingle,
  asyncToArray,
  clamp,
  extractZodSchemaKeys,
  filterObject,
  filterUndefined,
  first,
  firstMaybe,
  flattenObject,
  getEnv,
  hasDupes,
  hash,
  isDebugLoggingActive,
  last,
  limit,
  mapFilter,
  mapIter,
  mapObject,
  mergeAsyncGenerators,
  omit,
  parseRegexLike,
  pick,
  pluralize,
  regexIntersect,
  single,
  sleep,
  sortObject,
  streamToString,
  stringifyObject,
  stringToStream,
  throttle,
} from "./utils.ts"

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

  await t.step("throws error if there is no first", async () => {
    async function* yielder(): AsyncGenerator<string> {}

    await assertRejects(() => first(yielder()), "no element")
  })

  await t.step("yields undefined if the yielded value is undefined", async () => {
    async function* yielder(): AsyncGenerator<undefined> {
      yield undefined
    }

    assertEquals(await first(yielder()), undefined)
  })
})

Deno.test("firstMaybe", async (t) => {
  await t.step("yields first element of an AsyncGenerator", async () => {
    async function* yielder(): AsyncGenerator<string> {
      yield "foo"
      yield "bar"
    }

    assertEquals(await firstMaybe(yielder()), "foo")
  })

  await t.step("returns undefined if there is no first", async () => {
    async function* yielder(): AsyncGenerator<string> {}

    assertEquals(await firstMaybe(yielder()), undefined)
  })

  await t.step("yields undefined if the yielded value is undefined", async () => {
    async function* yielder(): AsyncGenerator<undefined> {
      yield undefined
    }

    assertEquals(await firstMaybe(yielder()), undefined)
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

Deno.test("mapIter", async (t) => {
  await t.step("maps over an iterator", async () => {
    const iter = mapIter((el) => el * 2, arrayToAsyncGenerator([1, 2, 3]))
    assertEquals(await asyncToArray(iter), [2, 4, 6])
  })
})

Deno.test("asyncMapIter", async (t) => {
  await t.step("maps over an iterator with an async function", async () => {
    const iter = asyncMapIter<number, number>((el) => Promise.resolve(el * 2), arrayToAsyncGenerator([1, 2, 3]))
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

Deno.test("flattenObject", async (t) => {
  await t.step("flattens trivial object", () => {
    assertEquals(flattenObject({ foo: "bar" }), { foo: "bar" })
  })

  await t.step("flattens multiple nested object", () => {
    assertEquals(
      flattenObject({
        foo: { bar: "baz", qux: { quux: 42 } },
        hello: { world: true },
      }),
      {
        "foo.bar": "baz",
        "foo.qux.quux": 42,
        "hello.world": true,
      },
    )
  })

  await t.step("flattens objects with arrays", () => {
    assertEquals(
      flattenObject({
        foo: { bar: ["a", "b"], qux: { quux: [1, 2] } },
        hello: { world: [true, false] },
      }),
      {
        "foo.bar": ["a", "b"],
        "foo.qux.quux": [1, 2],
        "hello.world": [true, false],
      },
    )
  })

  await t.step("handles nulls and undefined values", () => {
    assertEquals(
      flattenObject({
        foo: { bar: null, qux: { quux: undefined } },
        hello: { world: undefined },
      }),
      {
        "foo.bar": null,
        "foo.qux.quux": undefined,
        "hello.world": undefined,
      },
    )
  })

  await t.step("flattens a deeply nested object", () => {
    assertEquals(
      flattenObject({
        a: { b: { c: { d: { e: { f: { g: { h: { i: { j: "deep" } } } } } } } } },
      }),
      {
        "a.b.c.d.e.f.g.h.i.j": "deep",
      },
    )
  })
})

Deno.test("extractZodSchemaKeys", async (t) => {
  await t.step("extracts trivial schema", () => {
    assertEquals(extractZodSchemaKeys(z.string()), "ZodString")
    assertEquals(extractZodSchemaKeys(z.object({ foo: z.string() })), { foo: "ZodString" })
  })

  await t.step("extracts nested schema", () => {
    assertEquals(
      extractZodSchemaKeys(z.object({ foo: z.object({ bar: z.string() }) })),
      { foo: { bar: "ZodString" } },
    )
    assertEquals(
      extractZodSchemaKeys(z.object({ foo: z.object({ bar: z.object({ baz: z.string() }) }) })),
      { foo: { bar: { baz: "ZodString" } } },
    )
  })

  await t.step("extracts simple array schema", () => {
    assertEquals(extractZodSchemaKeys(z.array(z.string())), "ZodArray")
    assertEquals(extractZodSchemaKeys(z.object({ foo: z.array(z.string()) })), { foo: "ZodArray" })
  })

  await t.step("extracts deeply nested array schema", () => {
    assertEquals(
      extractZodSchemaKeys(z.object({ foo: z.array(z.object({ bar: z.object({ baz: z.string() }) })) })),
      { foo: "ZodArray" },
    )
  })

  await t.step("extracts simple number", () => {
    assertEquals(
      extractZodSchemaKeys(z.object({ foo: z.number().positive().min(1).max(100) })),
      { foo: "ZodNumber" },
    )
  })

  await t.step("extracts simple literal", () => {
    assertEquals(extractZodSchemaKeys(z.literal("foo")), "ZodLiteral(foo)")
    assertEquals(extractZodSchemaKeys(z.object({ foo: z.literal("foo") })), { foo: "ZodLiteral(foo)" })
  })

  await t.step("extracts simple unioned literals", () => {
    const schema = z.union([z.literal("bar"), z.literal("baz")])
    const expected = "ZodUnion ZodLiteral(bar) ZodLiteral(baz)"
    assertEquals(extractZodSchemaKeys(schema), expected)
    assertEquals(extractZodSchemaKeys(z.object({ foo: schema })), { foo: expected })
  })

  await t.step("extracts simple union details", () => {
    const schema = z.union([z.string(), z.null()])
    const expected = "ZodString"
    assertEquals(extractZodSchemaKeys(schema), expected)
    assertEquals(extractZodSchemaKeys(z.object({ foo: schema })), { foo: expected })
  })

  await t.step("extracts nested nullable schema", () => {
    const schema = z.object({ ham: z.object({ spam: z.string() }) })
    const expected = { ham: { spam: "ZodString" } }
    assertEquals(extractZodSchemaKeys(schema.nullable()), expected)
    assertEquals(extractZodSchemaKeys(z.union([schema, z.null()])), expected)
    assertEquals(extractZodSchemaKeys(z.union([z.null(), schema])), expected)
    assertEquals(extractZodSchemaKeys(z.object({ foo: z.union([schema, z.null()]) })), { foo: expected })
  })

  await t.step("extracts nested optional schema", () => {
    const schema = z.object({ ham: z.object({ spam: z.string() }) })
    const expected = { ham: { spam: "ZodString" } }
    assertEquals(extractZodSchemaKeys(schema.optional()), expected)
    assertEquals(extractZodSchemaKeys(z.object({ foo: schema.optional() })), { foo: expected })
  })

  await t.step("extracts nested nullable & optional schema", () => {
    const schema = z.object({ ham: z.object({ spam: z.string() }) })
    const expected = { ham: { spam: "ZodString" } }
    assertEquals(extractZodSchemaKeys(schema.nullable().optional()), expected)
    assertEquals(extractZodSchemaKeys(z.union([schema, z.null()]).optional()), expected)
    assertEquals(extractZodSchemaKeys(z.object({ foo: z.union([schema, z.null()]).optional() })), { foo: expected })
  })
})

Deno.test("stringifyObject", async (t) => {
  await t.step("handles empty object", () => {
    assertEquals(stringifyObject({}), {})
  })

  await t.step("handles string value", () => {
    assertEquals(stringifyObject({ foo: "bar" }), { foo: "bar" })
  })

  await t.step("handles number", () => {
    assertEquals(stringifyObject({ foo: 1 }), { foo: "1" })
  })

  await t.step("handles boolean", () => {
    assertEquals(stringifyObject({ foo: true }), { foo: "true" })
  })

  await t.step("handles date", () => {
    assertEquals(stringifyObject({ foo: new Date(0) }), { foo: "1970-01-01T00:00:00.000Z" })
  })

  await t.step("handles nested object", () => {
    assertEquals(
      stringifyObject({ foo: { bar: 42, baz: "test", ham: true, spam: { eggs: 1 } } }),
      { foo: { bar: "42", baz: "test", ham: "true", spam: { eggs: "1" } } },
    )
  })

  await t.step("handles array values", () => {
    assertEquals(stringifyObject({ foo: [1, "bar", true, { a: 42 }] }), { foo: '"1"; "bar"; "true"; {"a":"42"}' })
  })

  await t.step("discards undefined without stringifyUndefined option", () => {
    assertEquals(stringifyObject({ foo: undefined }), {})
  })

  await t.step("considers undefined an empty string with stringifyUndefined option", () => {
    assertEquals(stringifyObject({ foo: undefined }, { stringifyUndefined: true }), { foo: "" })
  })
})

Deno.test("parseRegexLike", async (t) => {
  await t.step("parses a regex-like string to a RegExp", () => {
    assertEquals(parseRegexLike("/.*/"), new RegExp(".*"))
  })

  await t.step("throws if not regex-like", () => {
    assertThrows(() => parseRegexLike("foo/"), Deno.errors.InvalidData)
  })
})

Deno.test("filterUndefined", async (t) => {
  await t.step("removes undefined fields from obj", () => {
    assertEquals(filterUndefined({ foo: "bar", ham: undefined }), { foo: "bar" })
  })

  await t.step("removes undefined fields from const obj", () => {
    const actual = filterUndefined({ foo: "bar", ham: undefined } as const)
    assertEquals(actual, { foo: "bar" } as const)
  })

  await t.step("can be used where merging in default values", () => {
    const actual = filterUndefined({
      foo: "foo",
      ...filterUndefined({} as {
        foo?: string
      }),
    })
    assertEquals(actual, { foo: "foo" })
  })

  await t.step("removes undefined elements in array", () => {
    assertEquals(filterUndefined(["foo", undefined]), ["foo"])
  })

  await t.step("removes undefined from the passed-in type", () => {
    const input: Array<string | undefined> = ["foo", undefined]
    const result: string[] = filterUndefined(input)
    const expected: string[] = ["foo"]
    assertEquals(result, expected)
  })

  await t.step("also handles `as const` types", () => {
    const input = ["foo", undefined] as const
    const result = filterUndefined(input)
    const expected = ["foo"]
    assertEquals(result, expected)
  })
})

Deno.test("stringToStream & streamToString", async (t) => {
  await t.step("can cast string to stream to string", async () => {
    const stream = stringToStream("foo")
    assertInstanceOf(stream, ReadableStream)
    const content = await streamToString(stream)
    assertEquals(content, "foo")
  })
})

Deno.test("isDebugLoggingActive", async (t) => {
  await t.step("detects a logger in DEBUG mode", () => {
    assertEquals(isDebugLoggingActive(new Logger("foo", "DEBUG")), true)
  })

  await t.step("detects a logger not in DEBUG mode", () => {
    assertEquals(isDebugLoggingActive(new Logger("foo", "INFO")), false)
  })
})

Deno.test("hash", async (t) => {
  await t.step("hashes a string", async () => {
    assertEquals(await hash("12345"), "5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5")
  })
})

Deno.test("sortObject", async (t) => {
  await t.step("sorts", () => {
    const actual = sortObject({
      car: 300,
      bike: 60,
      motorbike: 200,
      airplane: 1000,
      helicopter: 400,
      rocket: 8 * 60 * 60,
    })

    assertEquals(actual, {
      "bike": 60,
      "motorbike": 200,
      "car": 300,
      "helicopter": 400,
      "airplane": 1000,
      "rocket": 28800,
    })
  })
})

Deno.test("mapObject", async (t) => {
  await t.step("maps", () => {
    const actual = mapObject(
      { foo: "bar" } as const,
      ({ key, val }) => ({ key: key.toUpperCase(), val: val.toUpperCase() }),
    )

    assertEquals(actual, { FOO: "BAR" })
  })

  await t.step("can change types", () => {
    const actual = mapObject({ foo: "1" }, ({ val }) => ({ val: Number.parseInt(val) }))

    assertEquals(actual, { foo: 1 })
  })

  await t.step("can change just the key", () => {
    const actual = mapObject({ foo: "ham" }, ({ key }) => ({ key: `${key} bar` }))

    assertEquals(actual, { "foo bar": "ham" })
  })

  await t.step("can noop", () => {
    assertEquals(mapObject({ foo: "ham" }, () => {}), { foo: "ham" })
    assertEquals(mapObject({ foo: "ham" }, () => undefined), { foo: "ham" })
  })
})

Deno.test("filterObject", async (t) => {
  await t.step("can filter by key", () => {
    const actual = filterObject({ foo: "bar", ham: "spam" } as const, ({ key }) => key === "foo")

    assertEquals(actual, { foo: "bar" })
  })

  await t.step("can filter by value", () => {
    const actual = filterObject({ foo: "bar", ham: "spam" } as const, ({ val }) => val === "spam")

    assertEquals(actual, { ham: "spam" })
  })
})

Deno.test("pick", async (t) => {
  await t.step("picks", () => {
    const obj = { foo: "bar", ham: "spam" }

    assertEquals(pick(obj, "foo"), { foo: "bar" })
  })

  await t.step("can pick optionals too", () => {
    const obj: { foo: string; ham?: string } = { foo: "bar", ham: "spam" }

    assertEquals(pick(obj, "ham"), { ham: "spam" })
  })
})

Deno.test("omit", async (t) => {
  await t.step("omits", () => {
    const actual = omit({ foo: "bar", ham: "spam" }, "ham")

    assertEquals(actual, { foo: "bar" })
  })
})

Deno.test("clamp", async (t) => {
  await t.step("clamps", () => {
    assertEquals(clamp(1000, 0, 100), 100)
    assertEquals(clamp(-1000, 0, 100), 0)
  })
})
