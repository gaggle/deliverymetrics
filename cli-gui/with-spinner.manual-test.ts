import { sleep } from "../utils.ts";

import { withSpinner } from "./with-spinner.ts";

async function successScenario() {
  console.time("timer");

  console.timeLog("timer", "Test simple sleeper");
  await withSpinner(
    () => sleep(1000),
    { start: "Initializing...", succeed: "Initialized" },
  );

  console.timeLog("timer", "Test spinner that shows up after callable takes more than 500ms");
  await withSpinner(
    async () => await sleep(3000),
    { start: "Loading cached data", succeed: "Data loaded", delayFor: 1000 },
  );

  console.timeLog("timer", "Test simple sleeper");
  try {
    await withSpinner(
      async () => {
        await sleep(1000);
        throw new Error("stop");
      },
      { start: "Failing...", succeed: "<Should never render>" },
    );
  } catch (_) {
    // noop
  }

  console.timeLog("timer", "End of scenario");
}

await successScenario();
