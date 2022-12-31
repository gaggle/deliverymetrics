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
        sleep(100)
          .then(() => progress("actions-workflow"))
          .then(() => sleep(100))
          .then(() => progress("actions-workflow"))
          .then(() => sleep(100))
          .then(() => progress("actions-run"))
          .then(() => sleep(100))
          .then(() => progress("actions-run"))
          .then(() => sleep(100))
          .then(() => progress("actions-run")),
        sleep(100)
          .then(() => progress("pull"))
          .then(() => sleep(100))
          .then(() => progress("pull"))
          .then(() => sleep(100))
          .then(() => progress("pull"))
          .then(() => sleep(100))
          .then(() => progress("commit"))
          .then(() => sleep(100))
          .then(() => progress("commit"))
          .then(() => sleep(100))
          .then(() => progress("commit")),
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

await successScenario();
