import { join } from "std:path"
import { makeRunWithLimit as makeLimit } from "run-with-limit"

import { sortPullCommitsByKey } from "../../libs/github/utils/mod.ts"

import { ActionRun, ActionWorkflow, BoundGithubPullCommit, getGithubClient } from "../../libs/github/mod.ts"
import { yieldActionData, yieldPullRequestData, yieldPullRequestHistogram } from "../../libs/metrics/mod.ts"
import {
  arraySubtract,
  arrayToAsyncGenerator,
  inspectIter,
  mapIter,
  mergeAsyncGenerators,
  writeCSVToFile,
} from "../../libs/utils/mod.ts"

import { AbortError } from "../../libs/errors.ts"

import {
  GithubPullCommitHeaders,
  githubPullCommitHeaders,
  githubPullCommitsAsCsv,
} from "../csv/csv-github-pull-commit-headers.ts"
import { GithubPullHeaders, githubPullHeaders, githubPullsAsCsv } from "../csv/csv-github-pull-headers.ts"
import {
  githubActionRunAsCsv,
  GithubActionRunHeaders,
  githubActionRunHeaders,
} from "../csv/csv-github-action-run-headers.ts"
import {
  githubActionWorkflowAsCsv,
  GithubActionWorkflowHeaders,
  githubActionWorkflowHeaders,
} from "../csv/csv-github-action-workflows-headers.ts"
import { pullRequestHistogramAsCsv, pullRequestHistogramHeaders } from "../csv/csv-pull-request-histogram-headers.ts"

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
      ignoreHeaders: Array<GithubActionRunHeaders[number]>
      headerOrder: Array<GithubActionRunHeaders[number]>
      branch?: string
    }
    actionWorkflows?: {
      ignoreHeaders: Array<GithubActionWorkflowHeaders[number]>
      headerOrder: Array<GithubActionWorkflowHeaders[number]>
    }
    owner: string
    pullCommits?: {
      ignoreHeaders: Array<GithubPullCommitHeaders[number]>
      headerOrder: Array<GithubPullCommitHeaders[number]>
    }
    pulls?: {
      ignoreHeaders: Array<GithubPullHeaders[number]>
      headerOrder: Array<GithubPullHeaders[number]>
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
    const actionRunGenerators: Array<AsyncGenerator<{ actionRun: ActionRun; workflow: ActionWorkflow }>> = []
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

/**
 * Reorganizes an array of header strings by excluding specified headers and
 * ordering remaining headers according to a given order.
 *
 * @example
 * const headers = ['Header1', 'Header2', 'Header3', 'Header4'];
 * const ignoreHeaders = ['Header3'];
 * const headerOrder = ['Header4', 'Header1'];
 * const result = reorganizeHeaders(headers, { ignoreHeaders, headerOrder });
 * console.log(result); // ['Header4', 'Header1', 'Header2']
 */
function reorganizeHeaders(
  headers: ReadonlyArray<string>,
  { ignoreHeaders = [], headerOrder = [] }: {
    ignoreHeaders?: ReadonlyArray<string>
    headerOrder?: ReadonlyArray<string>
  },
): Array<string> {
  const withoutIgnoredHeaders = arraySubtract(headers, ignoreHeaders)
  const withoutOrderedHeaders = arraySubtract(withoutIgnoredHeaders, headerOrder)
  return [...headerOrder, ...withoutOrderedHeaders]
}

export const _internals = {
  getGithubClient,
}
