import type { mock, time } from "./dev-deps.ts";
import { mockFetch as mf } from "./dev-deps.ts";

export async function withMockedFetch(callback: (mockFetch: typeof mf) => Promise<void>) {
  mf.install();
  try {
    await callback(mf);
  } finally {
    mf.uninstall();
  }
}
export async function withStubs(callable: (...stubs: Array<mock.Stub>) => Promise<void>, ...stubs: Array<mock.Stub>): Promise<void> {
  try {
    await callable(...stubs);
  } finally {
    for (const stub of stubs) {
      stub.restore();
    }
  }
}
export async function withFakeTime(callable: (t: time.FakeTime) => Promise<void>, fakeTime: time.FakeTime): Promise<void> {
  try {
    await callable(fakeTime);
  } finally {
    fakeTime.restore();
  }
}
