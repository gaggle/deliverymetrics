import { AssertionError } from "dev:asserts"
import { FakeTime } from "dev:time"
import { install as mockFetchInstall, mock as mockFetch, uninstall as mockFetchUninstall } from "dev:mock-fetch"
import { Stub } from "dev:mock"

import { sleep } from "./utils/mod.ts"

export async function withMockedFetch(
  callback: (mf: typeof mockFetch) => Promise<void> | void,
) {
  mockFetchInstall()
  try {
    await callback(mockFetch)
  } finally {
    mockFetchUninstall()
  }
}

export async function withStubs(
  callable: (...stubs: Array<Stub>) => Promise<void> | void,
  ...stubs: Array<Stub>
): Promise<void> {
  try {
    await callable(...stubs)
  } finally {
    for (const stub of stubs) {
      stub.restore()
    }
  }
}

export async function withFakeTime(
  callable: (t: FakeTime) => Promise<void> | void,
  fakeTime: FakeTime,
): Promise<void> {
  try {
    await callable(fakeTime)
  } finally {
    fakeTime.restore()
  }
}

export async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeout = 1000,
  msg?: string,
): Promise<boolean> {
  const now = Date.now()

  while (true) {
    const result = await predicate()
    if (result === true) return true
    if (Date.now() > now + timeout) throw new AssertionError(msg || `waitFor timed out after ${timeout} ms`)
    await sleep(10)
  }
}
