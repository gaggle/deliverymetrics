import { assertEquals } from "dev:asserts"

import { asyncSingle, asyncToArray, mapIter } from "../../utils/mod.ts"

import { getFakeGithubActionRun } from "../github/api/action-run/get-fake-github-action-run.ts"
import { getFakeGithubActionWorkflow } from "../github/api/action-workflows/get-fake-github-action-workflow.ts"
import { createFakeReadonlyGithubClient, getFakeSyncInfo } from "../github/testing/mod.ts"

import { yieldActionData } from "./github-action-data.ts"

Deno.test("groups workflow with a generator for its runs", async () => {
  const gh = await createFakeReadonlyGithubClient({
    syncInfos: [
      getFakeSyncInfo({ type: "action-workflow", createdAt: 0, updatedAt: 0 }),
      getFakeSyncInfo({ type: "action-run", createdAt: 0, updatedAt: 0 }),
    ],
    actionWorkflows: [getFakeGithubActionWorkflow({ path: "foo.yml" })],
    actionRuns: [
      getFakeGithubActionRun({ run_number: 1, path: "foo.yml", head_branch: "main" }),
      getFakeGithubActionRun({ run_number: 2, path: "foo.yml", head_branch: "main" }),
      getFakeGithubActionRun({ run_number: 3, path: "foo.yml", head_branch: "branch" }),
      getFakeGithubActionRun({ run_number: 4, path: "bar.yml", head_branch: "main" }),
    ],
  })

  const {
    actionWorkflow,
    actionRunDataGenerator,
  } = await asyncSingle(yieldActionData(gh, { actionRun: { branch: "main" } }))

  assertEquals(actionWorkflow.path, "foo.yml")

  const runs = await asyncToArray(mapIter((el) => el.run.run_number, actionRunDataGenerator))
  assertEquals(runs, [1, 2])
})

Deno.test("calculates duration for runs", async () => {
  const gh = await createFakeReadonlyGithubClient({
    syncInfos: [
      getFakeSyncInfo({ type: "action-workflow", createdAt: 0, updatedAt: 0 }),
      getFakeSyncInfo({ type: "action-run", createdAt: 0, updatedAt: 0 }),
    ],
    actionWorkflows: [getFakeGithubActionWorkflow()],
    actionRuns: [getFakeGithubActionRun({
      run_started_at: new Date(0).toISOString(),
      updated_at: new Date(1000).toISOString(),
    })],
  })

  const { actionRunDataGenerator } = await asyncSingle(yieldActionData(gh))

  const runs = await asyncToArray(mapIter((el) => el.duration, actionRunDataGenerator))
  assertEquals(runs, [1000])
})
