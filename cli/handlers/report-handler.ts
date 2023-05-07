import { join } from "std:path"
import { makeRunWithLimit as makeLimit } from "run-with-limit"

import { GithubActionRun } from "../../libs/github/api/action-run/mod.ts"
import { GithubActionWorkflow } from "../../libs/github/api/action-workflows/mod.ts"
import { BoundGithubPullCommit } from "../../libs/github/api/pull-commits/mod.ts"

import { sortPullCommitsByKey } from "../../libs/github/github-utils/mod.ts"

import { getGithubClient } from "../../libs/github/mod.ts"
import { yieldActionData, yieldPullRequestData, yieldPullRequestHistogram } from "../../libs/metrics/mod.ts"
import {
  arrayToAsyncGenerator,
  inspectIter,
  mapIter,
  mergeAsyncGenerators,
  reorganizeHeaders,
  writeCSVToFile,
} from "../../libs/utils/mod.ts"

import { AbortError } from "../../libs/errors.ts"

import {
  githubActionRunAsCsv,
  githubActionRunHeaders,
  githubActionWorkflowAsCsv,
  githubActionWorkflowHeaders,
  githubPullCommitHeaders,
  githubPullCommitsAsCsv,
  githubPullHeaders,
  githubPullsAsCsv,
  pullRequestHistogramAsCsv,
  pullRequestHistogramHeaders,
} from "../csv/mod.ts"

import { dot, formatGithubClientStatus } from "./formatting.ts"

function* yieldHistogramTimeframes() {
  yield { mode: "daily", maxDays: 90 } as const
  yield { mode: "weekly", maxDays: 90 } as const
  yield { mode: "monthly", maxDays: 365 } as const
}

export interface ReportSpec {
  cacheRoot: string
  github: {
    actionRuns?: {
      headerOrder: Array<typeof githubActionRunHeaders[number] | RegExp>
      ignoreHeaders: Array<typeof githubActionRunHeaders[number] | RegExp>
      branch?: string
    }
    actionWorkflows?: {
      headerOrder: Array<typeof githubActionWorkflowHeaders[number] | RegExp>
      ignoreHeaders: Array<typeof githubActionWorkflowHeaders[number] | RegExp>
    }
    owner: string
    pullCommits?: {
      headerOrder: Array<typeof githubPullCommitHeaders[number] | RegExp>
      ignoreHeaders: Array<typeof githubPullCommitHeaders[number] | RegExp>
    }
    pulls?: {
      headerOrder: Array<typeof githubPullHeaders[number] | RegExp>
      ignoreHeaders: Array<typeof githubPullHeaders[number] | RegExp>
      ignoreLabels: Array<string | RegExp>
      includeCancelled: boolean
    }
    repo: string
  }
  outputDir: string
  signal?: AbortSignal
}

export async function reportHandler(
  { cacheRoot, github, outputDir, signal }: ReportSpec,
): Promise<void> {
  const gh = await _internals.getGithubClient({
    type: "ReadonlyGithubClient",
    persistenceDir: join(cacheRoot, "github", github.owner, github.repo),
    owner: github.owner,
    repo: github.repo,
  })
  const dataTimeframe = 90
  console.log(await formatGithubClientStatus(gh, { mostRecent: false, unclosed: false }))

  const { runWithLimit: limit } = makeLimit(4)

  const jobs: Array<Promise<unknown>> = []

  jobs.push(limit(async () => {
    const actionRunGenerators: Array<AsyncGenerator<{ actionRun: GithubActionRun; workflow: GithubActionWorkflow }>> =
      []
    console.log()
    await writeCSVToFile(
      join(outputDir, `github-action-workflows-data.csv`),
      githubActionWorkflowAsCsv(
        inspectIter((el) => {
          actionRunGenerators.push(mapIter((actionRun) => ({
            actionRun: actionRun,
            workflow: el.actionWorkflow,
          }), el.actionRunGenerator))
          dot()
        }, yieldActionData(gh, { actionRun: { maxDays: dataTimeframe, branch: github.actionRuns?.branch }, signal })),
      ),
      {
        header: reorganizeHeaders(githubActionWorkflowHeaders, {
          ignoreHeaders: github.actionWorkflows?.ignoreHeaders,
          headerOrder: github.actionWorkflows?.headerOrder,
        }),
      },
    )

    await writeCSVToFile(
      join(outputDir, `github-action-runs-data.csv`),
      githubActionRunAsCsv(inspectIter(() => dot(), mergeAsyncGenerators(...actionRunGenerators))),
      {
        header: reorganizeHeaders(githubActionRunHeaders, {
          ignoreHeaders: github.actionRuns?.ignoreHeaders,
          headerOrder: github.actionRuns?.headerOrder,
        }),
      },
    )
  }))

  jobs.push(limit(async () => {
    const pullCommits: Array<BoundGithubPullCommit> = []
    await writeCSVToFile(
      join(outputDir, `github-pulls-data.csv`),
      githubPullsAsCsv(
        inspectIter(
          (el) => {
            pullCommits.push(...el.commits)
            dot()
          },
          yieldPullRequestData(gh, {
            maxDays: dataTimeframe,
            excludeLabels: github.pulls?.ignoreLabels,
            includeCancelled: github.pulls?.includeCancelled,
            signal,
          }),
        ),
      ),
      {
        header: reorganizeHeaders(githubPullHeaders, {
          ignoreHeaders: github.pulls?.ignoreHeaders,
          headerOrder: github.pulls?.headerOrder,
        }),
      },
    )

    await writeCSVToFile(
      join(outputDir, `github-pull-commits-data.csv`),
      githubPullCommitsAsCsv(inspectIter(
        () => dot(),
        arrayToAsyncGenerator(sortPullCommitsByKey(pullCommits, "commit.author")),
      )),
      {
        header: reorganizeHeaders(githubPullCommitHeaders, {
          ignoreHeaders: github.pullCommits?.ignoreHeaders,
          headerOrder: github.pullCommits?.headerOrder,
        }),
      },
    )
  }))

  for (const { mode, maxDays } of yieldHistogramTimeframes()) {
    jobs.push(limit(() => {
      return writeCSVToFile(
        join(outputDir, `pull-request-lead-times-${mode}.csv`),
        pullRequestHistogramAsCsv(
          inspectIter(
            () => dot(),
            yieldPullRequestHistogram(gh, {
              mode,
              maxDays,
              excludeLabels: github.pulls?.ignoreLabels,
              signal,
            }),
          ),
        ),
        { header: pullRequestHistogramHeaders.slice() },
      )
    }))
  }

  try {
    await Promise.all(jobs)
  } catch (err) {
    if (err instanceof AbortError) {
      // Nothing more to do
    } else {
      throw err
    }
  }
}

export const _internals = {
  getGithubClient,
}
