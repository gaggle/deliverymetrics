import { asserts, } from "../dev-deps.ts";
import { GithubDiskCache, GithubMemoryCache, GithubMockCache } from "./github-cache.ts";
import { asyncToArray, sleep } from "../utils.ts";
import { GithubCache } from "./types.ts";
import { getFakePull } from "./testing.ts";

const githubCacheProviders: Array<{
  cacheProvider: (callable: (opts: { cache: GithubCache }) => Promise<void>) => Promise<void>,
  name: string
}> = [
  {
    cacheProvider: async (callable) => {
      const dir = await Deno.makeTempDir();
      try {
        const cache = await GithubDiskCache.init(dir);
        await sleep(1000);
        await callable({ cache });
      } finally {
        await Deno.remove(dir, { recursive: true });
      }
    },
    name: "GithubDiskCache"
  },
  {
    cacheProvider: async (callable) => {
      await callable({ cache: new GithubMemoryCache() });
    },
    name: "GithubMemoryCache"
  },
  {
    cacheProvider: async (callable) => {
      await callable({ cache: new GithubMockCache() });
    },
    name: "GithubMockCache"
  }
];

for (const { cacheProvider, name } of githubCacheProviders) {
  Deno.test(`${name} updatedAt`, async (t) => {
    await cacheProvider(async ({ cache }) => {
      await t.step("should start with no updatedAt", async () => {
        asserts.assertEquals(await cache.getUpdatedAt(), undefined);
      });

      await t.step("can sets updatedAt", async () => {
        asserts.assertEquals(await cache.putUpdatedAt(10_000), undefined);
      });

      await t.step("getting updatedAt matches what was set", async () => {
        asserts.assertEquals(await cache.getUpdatedAt(), 10_000);
      });
    });
  });

  Deno.test(`${name} pull-requests`, async (t) => {
    await cacheProvider(async ({ cache }) => {
      await t.step("should start with no pulls", async () => {
        asserts.assertEquals(await asyncToArray(cache.getPulls()), []);
      });

      await t.step("can put new pulls", async () => {
        asserts.assertEquals(
          await cache.putPulls([getFakePull({ id: 1, number: 1 }), getFakePull({ id: 2, number: 2 })]),
          undefined
        );
      });

      await t.step("should get pulls that were just putted", async () => {
        asserts.assertEquals(
          await asyncToArray(cache.getPulls()),
          [getFakePull({ id: 1, number: 1 }), getFakePull({ id: 2, number: 2 })]
        );
      });

      await t.step("can add pulls with a sync time", async () => {
        await cache.putPulls([getFakePull()], { syncTime: 10_000 });
        asserts.assertEquals(await cache.getUpdatedAt(), 10_000);
      });
    });
  });

  Deno.test(`${name} single pull-request`, async (t) => {
    await cacheProvider(async ({ cache }) => {
      await t.step("should start with no pull", async () => {
        asserts.assertEquals(await asyncToArray(cache.getPulls()), []);
      });

      await t.step("can put a new pull", async () => {
        asserts.assertEquals(
          await cache.putPull(getFakePull({ id: 3, number: 3 })),
          undefined
        );
      });

      await t.step("should get the pull that was just putted", async () => {
        asserts.assertEquals(
          await asyncToArray(cache.getPulls()),
          [getFakePull({ id: 3, number: 3 })]
        );
      });

      await t.step("can add a pull with a sync time", async () => {
        await cache.putPull(getFakePull(), { syncTime: 10_000 });
        asserts.assertEquals(await cache.getUpdatedAt(), 10_000);
      });
    });
  });
}

Deno.test("GithubMockCache#ctor", async (t) => {
  await t.step("can be initialized with pulls", async () => {
    const cache = new GithubMockCache({ pulls: [getFakePull()] });
    asserts.assertEquals(await asyncToArray(cache.getPulls()), [getFakePull()]);
  });

  await t.step("can be initialized with an updatedAt", async () => {
    const cache = new GithubMockCache({ updatedAt: 10_000 });
    asserts.assertEquals(await cache.getUpdatedAt(), 10_000);
  });
});
