import { FakeTime } from "dev:time";
import { install as mockFetchInstall, mock as mockFetch, uninstall as mockFetchUninstall } from "dev:mock-fetch";
import { Stub } from "dev:mock";

export async function withMockedFetch(
  callback: (mf: typeof mockFetch) => Promise<void>,
) {
  mockFetchInstall();
  try {
    await callback(mockFetch);
  } finally {
    mockFetchUninstall();
  }
}

export async function withStubs(
  callable: (...stubs: Array<Stub>) => Promise<void>,
  ...stubs: Array<Stub>
): Promise<void> {
  try {
    await callable(...stubs);
  } finally {
    for (const stub of stubs) {
      stub.restore();
    }
  }
}

export async function withFakeTime(
  callable: (t: FakeTime) => Promise<void>,
  fakeTime: FakeTime,
): Promise<void> {
  try {
    await callable(fakeTime);
  } finally {
    fakeTime.restore();
  }
}
