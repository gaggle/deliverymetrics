import { assertEquals } from "dev:asserts"

import { getFakeGithubPull } from "../api/pulls/get-fake-github-pull.ts"

import { stringifyPull, stringifyUpdatedPull } from "./stringify.ts"

Deno.test("stringifyPull", async (t) => {
  await t.step("makes a nice string", () => {
    assertEquals(
      stringifyPull(getFakeGithubPull({
        _links: { html: { href: "https://url" } },
        number: 1,
        state: "open",
      })),
      "#1 (open) https://url",
    )
  })

  await t.step("understands draft mode", () => {
    assertEquals(
      stringifyPull(getFakeGithubPull({
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
        prev: getFakeGithubPull({
          _links: { html: { href: "https://url" } },
          number: 1,
          state: "open",
        }),
        updated: getFakeGithubPull({
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
        prev: getFakeGithubPull({
          _links: { html: { href: "https://url" } },
          draft: true,
          number: 1,
          state: "open",
        }),
        updated: getFakeGithubPull({
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
      prev: getFakeGithubPull({
        _links: { html: { href: "https://url" } },
        number: 1,
        state: "open",
      }),
      updated: getFakeGithubPull({
        _links: { html: { href: "https://url" } },
        draft: true,
        number: 1,
        state: "open",
      }),
    }),
    "#1 (open -> draft) https://url",
  )
})
