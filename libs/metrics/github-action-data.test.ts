import { assertEquals } from "dev:asserts"

import { asyncSingle, asyncToArray, mapIter } from "../../utils/mod.ts"

import { getFakeGithubActionRun } from "../github/api/action-run/get-fake-github-action-run.ts"
import { getFakeGithubActionWorkflow } from "../github/api/action-workflows/get-fake-github-action-workflow.ts"
import { createFakeReadonlyGithubClient, getFakeSyncInfo } from "../github/testing/mod.ts"

import { yieldActionData } from "./github-action-data.ts"

Deno.test("groups workflow with a generator for its runs", async () => {
  const workflow = getFakeGithubActionWorkflow({ path: "foo.yml" })
  const run = getFakeGithubActionRun({ path: "foo.yml" })

  const gh = await createFakeReadonlyGithubClient({
    syncInfos: [
      getFakeSyncInfo({ type: "action-workflow", createdAt: 0, updatedAt: 0 }),
      getFakeSyncInfo({ type: "action-run", createdAt: 0, updatedAt: 0 }),
    ],
    actionWorkflows: [workflow],
    actionRuns: [run],
  })

  const { actionWorkflow, actionRunDataGenerator } = await asyncSingle(yieldActionData(gh))

  assertEquals(actionWorkflow.path, workflow.path)

  const runs = await asyncToArray(mapIter((el) => el.run.path, actionRunDataGenerator))
  assertEquals(runs, ["foo.yml"])
})
