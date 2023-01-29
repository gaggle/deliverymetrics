import { sleep } from "../../libs/utils/mod.ts"

import { withProgress } from "./with-progress.ts"

async function scenarioSimple() {
  console.time("timer")
  await withProgress(async ({ increment }) => {
    await recurse(async () => {
      await sleep(15)
      increment("foo")
    }, 100)
  }, {
    title: "scenarioSimple",
    bars: { foo: {} },
  })
  console.timeEnd("timer")
}

async function scenarioHiddenBars() {
  console.time("timer")
  await withProgress(
    async ({ increment, render }) => {
      await Promise.all([
        recurse(async (iter) => {
          await sleep(175)
          increment("foo", { text: `Foo ${iter}` })
        }, 15),
        Promise.resolve(render("bar", { completed: 0, text: "Waiting..." }))
          .then(() => sleep(1500))
          .then(() =>
            recurse(async (iter) => {
              await sleep(500)
              increment("bar", { text: `Bar ${iter}` })
            }, 5)
          ),
        recurse(async (iter) => {
          await sleep(40)
          increment("baz", { text: `Baz ${iter}` })
        }, 150),
      ])
    },
    {
      title: "scenarioHiddenBars",
      display: ":text",
      bars: {
        foo: { total: Number.MAX_SAFE_INTEGER },
        bar: { total: Number.MAX_SAFE_INTEGER },
        baz: { total: Number.MAX_SAFE_INTEGER },
      },
    },
  )
  console.timeEnd("timer")
}

async function scenario3() {
  console.time("timer")
  await withProgress(
    async ({ increment, render }) => {
      await Promise.all([
        recurse(async (iter) => {
          await sleep(175)
          increment("foo", { text: `Foo ${iter}`, total: 10 })
        }, 10),
        Promise.resolve(render("bar", { text: "Waiting a while..." }))
          .then(() => sleep(200))
          .then(() =>
            recurse(async (iter) => {
              await sleep(200)
              increment("bar", { text: `Bar ${iter}` })
            }, 5)
          ),
        recurse(async () => {
          await sleep(0)
          increment("baz", { text: `Baz` })
        }, 120),
      ])
    },
    {
      title: "Manually testing withProgress",
      display: ":bar :completed/:total :text",
      width: 10,
      bars: {
        foo: {},
        bar: { total: 5 },
        baz: { total: 120 },
      },
    },
  )
  console.timeEnd("timer")
}

async function scenarioRenderBug() {
  console.time("timer")
  await withProgress(
    async ({ increment, render }) => {
      await Promise.all([
        Promise.resolve(render("foo", { completed: 0, text: "Just a bit longer..." }))
          .then(() => sleep(500))
          .then(() => increment("foo", { text: "Foo" }))
          .then(() => sleep(750)),
        Promise.resolve(increment("bar", { text: "Long text..." }))
          .then(() => sleep(1000))
          .then(() => increment("bar", { text: "Bar" })),
        Promise.resolve(increment("baz"))
          .then(() => sleep(1000))
          .then(() => increment("baz", { text: "Foo" })),
      ])
    },
    {
      title: "Manually testing against text overflow bug",
      bars: {
        foo: { total: 1, text: "Waiting a while before starting..." },
        bar: { total: 2 },
        baz: { total: 2 },
      },
    },
  )

  await withProgress(({ increment, render }) =>
    Promise.resolve(increment("foo", { text: "1st increment" }))
      .then(() => sleep(500))
      .then(() => render("foo", { text: "Done" })), {
    // Fails to render this last update because all items completed?
    title: "Manually testing an update bug",
    bars: {
      foo: { total: 1, text: "Waiting a while before starting..." },
    },
  })
  console.timeEnd("timer")
}

async function scenarioError() {
  console.time("timer")
  await withProgress(async ({ increment, render }) => {
    await Promise.all([
      recurse(async (idx) => {
        await sleep(50)
        increment("foo", { text: `Foo ${idx}` })
      }, 3),
      sleep(400)
        .then(() => render("bar", { completed: 80, total: 83, text: "Bar" }))
        .then(() => sleep(400))
        .then(() =>
          recurse(async (idx) => {
            await sleep(25)
            increment("bar", { text: `Bar ${idx}` })
          }, 3)
        ),
      sleep(600)
        .then(() =>
          recurse(async (idx) => {
            await sleep(25)
            increment("baz", { text: `Baz ${idx}`, total: 3 })
          }, 3)
        ),
    ])
  }, { bars: { foo: { total: 3 } } })
  console.timeEnd("timer")
}

async function recurse(callable: (iter: number) => Promise<void> | void, count: number) {
  let iter = 0
  while (iter < count) {
    await callable(iter)
    iter++
  }
}

await scenarioSimple()
await scenarioHiddenBars()
await scenario3()
await scenarioRenderBug()
await scenarioError()
