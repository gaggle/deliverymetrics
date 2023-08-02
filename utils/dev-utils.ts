import { FakeTime } from "dev:time"
import { AssertionError } from "dev:asserts"
import { Spy, spy, Stub } from "dev:mock"
import { install as mockFetchInstall, mock as mockFetch, uninstall as mockFetchUninstall } from "dev:mock-fetch"

import { sleep } from "../libs/utils/mod.ts"

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

export class CannedResponses {
  private readonly data:
    | { responses: Array<Response | Error>; cb?: never }
    | { cb: typeof fetch; responses?: never }

  /**
   * A convenience-spy to track how #fetch has been called
   */
  public readonly fetchSpy = spy()

  constructor(responsesOrCb: Array<Response | Error> | typeof fetch) {
    if (Array.isArray(responsesOrCb)) {
      this.data = { responses: [...responsesOrCb] }
    } else {
      this.data = { cb: responsesOrCb }
    }
  }

  fetch: typeof fetch = async (...args: Parameters<typeof fetch>): ReturnType<typeof fetch> => {
    this.fetchSpy(...args)
    let value: Response | Error | undefined
    if (this.data.responses) {
      value = this.data.responses.shift()
    } else {
      value = await this.data.cb(...args)
    }
    if (value instanceof Error) {
      return Promise.reject(value)
    }
    if (value === undefined) {
      return Promise.reject(new Error("No more canned responses"))
    }
    return Promise.resolve(value)
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

// deno-lint-ignore no-explicit-any
type GenericFunction = (...args: any) => any

export function extractCallArgsFromStub<T extends GenericFunction | undefined = undefined>(
  stub: Stub | Spy,
  callIdx: number,
  opts: Partial<{ expectedArgs: number; expectedCalls: number }> = {},
): T extends GenericFunction ? Parameters<T> : unknown[] {
  if (callIdx >= stub.calls.length) {
    throw new AssertionError(`stub was called ${stub.calls.length} times so cannot access index ${callIdx}`)
  }

  if (opts.expectedCalls !== undefined && stub.calls.length !== opts.expectedCalls) {
    throw new AssertionError(
      `stub was called ${stub.calls.length} times but was expected to be called ${opts.expectedCalls} times`,
    )
  }

  const args = stub.calls[callIdx].args
  if (opts.expectedArgs !== undefined && args.length !== opts.expectedArgs) {
    throw new AssertionError(
      `stub called with ${args.length} args but was expected to be called with ${opts.expectedArgs} args`,
    )
  }

  return args as T extends GenericFunction ? Parameters<T> : unknown[]
}
