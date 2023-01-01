import { resolvesNext, stub } from "dev:mock";

import { createFakeGithubClient, getFakePull, getFakeSyncInfo } from "../github/testing.ts";

import { sleep } from "../utils.ts";
import { withStubs } from "../dev-utils.ts";

import { _internals, githubSyncHandler } from "./sync-github.ts";

async function successScenario() {
  const openPull = getFakePull({ number: 1, state: "open" });

  const fakeGithubClient = await createFakeGithubClient({
    pulls: [
      openPull,
      getFakePull({ number: 2, state: "closed" }),
    ],
    syncInfos: [
      getFakeSyncInfo({ createdAt: 0, updatedAt: 10 * 1000 /* 10 seconds */ }),
    ],
  });

  stub(fakeGithubClient, "sync", async (args) => {
    const progress = args?.progress;
    if (progress) {
      await Promise.all([
        recurse(async () => {
          await sleep(300);
          progress("actions-workflow");
        }, 2)
          .then(() =>
            recurse(async () => {
              await sleep(300);
              progress("actions-run");
            }, 40)
          ),
        recurse(async () => {
          await sleep(300);
          progress("pull");
        }, 20)
          .then(() =>
            recurse(async () => {
              await sleep(300);
              progress("commit");
            }, 10)
          ),
      ]);
    }
    return Promise.resolve({
      newPulls: [getFakePull({ number: 3 })],
      updatedPulls: [{ prev: openPull, updated: getFakePull({ ...openPull, state: "closed" }) }],
      syncedAt: 20 * 1000,
    });
  });

  await withStubs(
    async () => {
      await githubSyncHandler({
        owner: "owner",
        persistenceRoot: "persistenceRoot",
        repo: "repo",
        token: "token",
      });
    },
    stub(
      _internals,
      "getGithubClient",
      resolvesNext([fakeGithubClient]),
    ),
  );
}

async function recurse(callable: (iter: number) => Promise<void>, count: number) {
  let iter = 0;
  while (iter <= count) {
    await callable(iter);
    iter++;
  }
}

await successScenario();
