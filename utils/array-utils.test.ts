import { assertEquals } from "dev:asserts"
import { assert, IsExact } from "dev:conditional-type-checks"

import { arraySubtract, arraySubtractRegEx } from "./array-utils.ts"

Deno.test("arraySubtract", async (t) => {
  await t.step("subtracts trivial arrays", () => {
    const result = arraySubtract([1, 2, 3], [1])
    assertEquals(result, [2, 3])
  })

  await t.step("subtracts arrays", () => {
    const result = arraySubtract(["foo", "bar", "baz"], ["foo", "baz"])
    assertEquals(result, ["bar"])
  })

  await t.step("subtracts complex arrays", () => {
    const result = arraySubtract(["foo", "bar", "baz", "foo", "bar"] as string[], ["foo", "baz"] as string[])
    assertEquals(result, ["bar", "bar"])
  })

  await t.step("given string arrays return type is a string array", () => {
    const arr1 = ["foo"]
    const arr2 = ["bar"]
    const result = arraySubtract(arr1, arr2)
    assert<IsExact<typeof result, Array<string>>>(true)
  })

  await t.step("given number arrays return type is a number array", () => {
    const arr1 = [1]
    const arr2 = [1]
    const result = arraySubtract(arr1, arr2)
    assert<IsExact<typeof result, Array<number>>>(true)
  })

  await t.step("given readonly arrays return type matches ", () => {
    const arr1 = [1, 2] as const
    const arr2 = [2] as const
    const result = arraySubtract(arr1, arr2)
    assert<IsExact<typeof result, Array<1 | 2>>>(true)
  })

  await t.step("given readonly arrays return type matches ", () => {
    const arr1 = [1]
    const arr2 = [1] as const
    const result = arraySubtract(arr1, arr2)
    assert<IsExact<typeof result, Array<number>>>(true)
  })
})

Deno.test("arraySubtractRegEx", async (t) => {
  await t.step("subtracts string arrays", () => {
    assertEquals(arraySubtractRegEx(["1", "2", "3"], ["1"]), ["2", "3"])
  })

  await t.step("subtracts based on regex matching", () => {
    assertEquals(arraySubtractRegEx(["foo", "bar", "baz"], [/^ba\w$/]), ["foo"])
  })
})
