import { makeRunWithLimit as makeLimit } from "run-with-limit"
import { slugify } from "slugify"
import { join } from "std:path"

import { GithubActionWorkflow } from "../../libs/github/api/action-workflows/mod.ts"
import { BoundGithubPullCommit } from "../../libs/github/api/pull-commits/mod.ts"
import { sortPullCommitsByKey } from "../../libs/github/github-utils/mod.ts"
import { getGithubClient } from "../../libs/github/mod.ts"
import { getJiraClient } from "../../libs/jira/mod.ts"
import {
  extractStateTransitions,
  getJiraSearchDataYielder,
  GetJiraSearchDataYielderReturnType,
  yieldActionData,
  yieldCommitData,
  yieldContinuousIntegrationHistogram,
  yieldPullRequestData,
  yieldPullRequestHistogram,
  yieldReleaseData,
  yieldStatsCodeFrequency,
  yieldStatsCommitActivity,
  yieldStatsContributors,
  yieldStatsParticipation,
  yieldStatsPunchCard,
} from "../../libs/metrics/mod.ts"
import type { ActionRunData } from "../../libs/metrics/types.ts"

import {
  AbortError,
  arrayToAsyncGenerator,
  asyncToArray,
  inspectIter,
  mapIter,
  mergeAsyncGenerators,
  reorganizeHeaders,
  timeCtx,
  writeCSVToFile,
} from "../../utils/mod.ts"

import {
  ciHistogramAsCsv,
  ciHistogramHeaders,
  githubActionRunAsCsv,
  githubActionRunHeaders,
  githubActionWorkflowAsCsv,
  githubActionWorkflowHeaders,
  githubCommitHeaders,
  githubCommitsAsCsv,
  githubPullCommitHeaders,
  githubPullCommitsAsCsv,
  githubPullHeaders,
  githubPullsAsCsv,
  githubReleaseHeaders,
  githubReleasesAsCsv,
  githubStatsCodeFrequenciesAsCsv,
  githubStatsCodeFrequencyHeaders,
  githubStatsCommitActivityAsCsv,
  githubStatsCommitActivityHeaders,
  githubStatsContributorsAsCsv,
  githubStatsContributorsHeaders,
  githubStatsParticipationAsCsv,
  githubStatsParticipationHeaders,
  githubStatsPunchCardAsCsv,
  githubStatsPunchCardHeaders,
  jiraSearchDataHeaders,
  jiraSearchDataIssuesAsCsv,
  jiraTransitionDataHeaders,
  jiraTransitionDatasAsCsv,
  pullRequestHistogramAsCsv,
  pullRequestHistogramHeaders,
} from "../csv/mod.ts"
import { jiraSearchDataIssueAsCsv } from "../csv/csv-jira-search-data.ts"

import { dot, formatGithubClientStatus } from "./formatting.ts"

function* yieldHistogramTimeframes() {
  yield { mode: "daily", maxDays: 90 } as const
  yield { mode: "weekly", maxDays: 90 } as const
  yield { mode: "monthly", maxDays: 365 } as const
}

type ReportSpecGitHub = {
  actionRuns?: {
    headerOrder: Array<typeof githubActionRunHeaders[number] | RegExp>
    ignoreHeaders: Array<typeof githubActionRunHeaders[number] | RegExp>
    branch?: string
    workflow?: string
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

type ReportSpecJira = {
  apiUser: string
  completedDateHeader?: string
  devLeadTimeStatuses?: string[]
  devLeadTimeTypes?: string[]
  headerOrder?: Array<string | RegExp>
  host: string
  ignoreHeaders?: Array<string | RegExp>
  startDateHeader?: string
}

export interface ReportSpec {
  cacheRoot: string
  github?: ReportSpecGitHub
  jira?: ReportSpecJira
  outputDir: string
  signal?: AbortSignal
}

export async function reportHandler(
  { cacheRoot, github, jira, outputDir, signal }: ReportSpec,
): Promise<void> {
  const dataTimeframe = 90

  const { runWithLimit: limit } = makeLimit(4)

  const jobs: Array<Promise<unknown>> = []

  if (github) {
    await asyncToArray(mapIter(
      (el) => jobs.push(limit(el)),
      queueGitHubReportJobs(github, { cacheRoot, dataTimeframe, outputDir, signal }),
    ))
  }

  if (jira) {
    await asyncToArray(mapIter(
      (el) => jobs.push(limit(el)),
      queueJiraReportJobs(jira, { cacheRoot, dataTimeframe, outputDir, signal }),
    ))
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

async function* queueGitHubReportJobs(spec: ReportSpecGitHub, { cacheRoot, dataTimeframe, outputDir, signal }: {
  cacheRoot: string
  dataTimeframe: number
  outputDir: string
  signal?: AbortSignal
}): AsyncGenerator<() => Promise<void>> {
  const gh = await _internals.getGithubClient({
    type: "ReadonlyGithubClient",
    persistenceDir: join(cacheRoot, "github", spec.owner, spec.repo),
    owner: spec.owner,
    repo: spec.repo,
  })
  console.log(await formatGithubClientStatus(gh, { mostRecent: false, unclosed: false }))

  yield async () => {
    await timeCtx("action-run, action-workflows", async () => {
      const actionRunGens: Array<AsyncGenerator<{ actionRunData: ActionRunData; workflow: GithubActionWorkflow }>> = []
      await writeCSVToFile(
        join(outputDir, "github-action-workflows-data.csv"),
        githubActionWorkflowAsCsv(
          inspectIter(
            (el) => {
              actionRunGens.push(mapIter((run) => ({
                actionRunData: run,
                workflow: el.actionWorkflow,
              }), el.actionRunDataGenerator))
              dot()
            },
            yieldActionData(gh, { actionRun: { maxDays: dataTimeframe, branch: spec.actionRuns?.branch }, signal }),
          ),
        ),
        {
          header: reorganizeHeaders(githubActionWorkflowHeaders, {
            ignoreHeaders: spec.actionWorkflows?.ignoreHeaders,
            headerOrder: spec.actionWorkflows?.headerOrder,
          }),
        },
      )

      await writeCSVToFile(
        join(outputDir, `github-action-runs-data.csv`),
        githubActionRunAsCsv(inspectIter(() => dot(), mergeAsyncGenerators(...actionRunGens))),
        {
          header: reorganizeHeaders(githubActionRunHeaders, {
            ignoreHeaders: spec.actionRuns?.ignoreHeaders,
            headerOrder: spec.actionRuns?.headerOrder,
          }),
        },
      )
    })
  }

  for (const { mode, maxDays } of yieldHistogramTimeframes()) {
    const fileName = `continuous-integration-${mode}.csv`
    yield async () => {
      await timeCtx(fileName, async () => {
        const ciHistogramYielder = yieldContinuousIntegrationHistogram(gh, {
          mode,
          maxDays,
          branch: spec.actionRuns?.branch,
          workflow: spec.actionRuns?.workflow ? { path: spec.actionRuns?.workflow } : undefined,
          signal,
        })
        await writeCSVToFile(
          join(outputDir, fileName),
          ciHistogramAsCsv(
            inspectIter(
              () => dot(),
              ciHistogramYielder,
            ),
          ),
          { header: ciHistogramHeaders.slice() },
        )
      })
    }
  }

  yield async () => {
    await timeCtx("commits", async () => {
      await writeCSVToFile(
        join(outputDir, "github-commits-data.csv"),
        githubCommitsAsCsv(
          yieldCommitData(gh, { authoredMaxDaysAgo: dataTimeframe, committedMaxDaysAgo: dataTimeframe, signal }),
        ),
        { header: githubCommitHeaders },
      )
    })
  }

  yield async () => {
    await timeCtx("pull-commits, pulls", async () => {
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
              excludeLabels: spec.pulls?.ignoreLabels,
              includeCancelled: spec.pulls?.includeCancelled,
              signal,
            }),
          ),
        ),
        {
          header: reorganizeHeaders(githubPullHeaders, {
            ignoreHeaders: spec.pulls?.ignoreHeaders,
            headerOrder: spec.pulls?.headerOrder,
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
            ignoreHeaders: spec.pullCommits?.ignoreHeaders,
            headerOrder: spec.pullCommits?.headerOrder,
          }),
        },
      )
    })
  }

  for (const { mode, maxDays } of yieldHistogramTimeframes()) {
    yield async () => {
      await timeCtx(`pull-request-lead-times ${mode} histogram`, async () => {
        await writeCSVToFile(
          join(outputDir, `pull-request-lead-times-${mode}.csv`),
          pullRequestHistogramAsCsv(
            inspectIter(
              () => dot(),
              yieldPullRequestHistogram(gh, {
                mode,
                maxDays,
                excludeLabels: spec.pulls?.ignoreLabels,
                signal,
              }),
            ),
          ),
          { header: pullRequestHistogramHeaders.slice() },
        )
      })
    }
  }

  yield async () => {
    await timeCtx("releases", async () => {
      await writeCSVToFile(
        join(outputDir, "github-releases-data.csv"),
        githubReleasesAsCsv(yieldReleaseData(gh, { publishedMaxDaysAgo: dataTimeframe, signal })),
        { header: githubReleaseHeaders },
      )
    })
  }

  yield async () => {
    await timeCtx("stats-code-frequency", async () => {
      await writeCSVToFile(
        join(outputDir, "github-stats-code-frequency-data.csv"),
        githubStatsCodeFrequenciesAsCsv(yieldStatsCodeFrequency(gh, { maxDays: dataTimeframe, signal })),
        { header: githubStatsCodeFrequencyHeaders },
      )
    })
  }

  yield async () => {
    await timeCtx("stats-commit-activity", async () => {
      await writeCSVToFile(
        join(outputDir, "github-stats-commit-activity-data.csv"),
        githubStatsCommitActivityAsCsv(yieldStatsCommitActivity(gh, { maxDays: dataTimeframe, signal })),
        { header: githubStatsCommitActivityHeaders },
      )
    })
  }

  yield async () => {
    await timeCtx("stats-contributors", async () => {
      await writeCSVToFile(
        join(outputDir, "github-stats-contributors-data.csv"),
        githubStatsContributorsAsCsv(yieldStatsContributors(gh, { maxDays: dataTimeframe, signal })),
        { header: githubStatsContributorsHeaders },
      )
    })
  }

  yield async () => {
    await timeCtx("stats-participation", async () => {
      await writeCSVToFile(
        join(outputDir, "github-stats-participation-data.csv"),
        githubStatsParticipationAsCsv(yieldStatsParticipation(gh, { signal })),
        { header: githubStatsParticipationHeaders },
      )
    })
  }

  yield async () => {
    await timeCtx("stats-punch-card", async () => {
      await writeCSVToFile(
        join(outputDir, "github-stats-punch-card-data.csv"),
        githubStatsPunchCardAsCsv(yieldStatsPunchCard(gh, { signal })),
        { header: githubStatsPunchCardHeaders },
      )
    })
  }
}

async function* queueJiraReportJobs(jira: ReportSpecJira, opts: {
  cacheRoot: string
  dataTimeframe: number
  outputDir: string
  signal?: AbortSignal
}): AsyncGenerator<() => Promise<void>> {
  const jc = await _internals.getJiraClient({
    type: "ReadonlyJiraClient",
    persistenceDir: join(opts.cacheRoot, "jira", slugify(jira.host), slugify(jira.apiUser)),
  })

  const completedDateHeader = jira.completedDateHeader
  const startDateHeader = jira.startDateHeader
  if (completedDateHeader && startDateHeader) {
    yield async () => {
      await timeCtx("jira-focusedobjective-team-dashboard-data", async () => {
        const { yieldJiraSearchIssues } = await getJiraSearchDataYielder(jc, {
          includeStatuses: jira.devLeadTimeStatuses,
          includeTypes: jira.devLeadTimeTypes,
          maxDays: opts.dataTimeframe,
          signal: opts.signal,
          sortBy: { key: completedDateHeader, type: "date" },
        })

        await writeCSVToFile(
          join(opts.outputDir, "jira-focusedobjective-team-dashboard-data.csv"),
          mapIter((el) => {
            const completed = el[completedDateHeader]
            const started = el[startDateHeader]
            // ↑ These come out of the CSV function so are *always* strings,
            // but if empty might be stringified as "null"
            return {
              "Completed Date": completed === "null" ? "null" : YYYYMMDD(completed),
              "Start Date": started === "null" ? "null" : YYYYMMDD(started),
              "Type": el["fields.Issue Type.name"],
              "Key": el["key"],
              "Summary": el["fields.Summary"],
              "Status": el["fields.Status.name"],
              "Components": el["Component Names"],
            }
          }, jiraSearchDataIssuesAsCsv(yieldJiraSearchIssues)),
          {
            header: [
              "Completed Date",
              "Start Date",
              "Type",
              "Key",
              "Summary",
              "Status",
              "Components",
            ],
          },
        )
      })
    }

    yield async () => {
      await timeCtx("jira-transitions-data", async () => {
        const { fieldKeys, yieldJiraSearchIssues } = await getJiraSearchDataYielder(jc, {
          maxDays: opts.dataTimeframe,
          signal: opts.signal,
          sortBy: { key: completedDateHeader, type: "date" },
        })
        const filteredHeaders = [
          ...jiraTransitionDataHeaders.map((el) => el),
          ...jiraSearchDataHeaders({
            fieldKeys,
            excludeHeaders: jira.ignoreHeaders,
            headersOrder: jira.headerOrder,
            includeHeaders: jira.headerOrder,
          }),
        ] as const

        async function* transformer(
          jiraSearchDataYielder: GetJiraSearchDataYielderReturnType["yieldJiraSearchIssues"],
        ) {
          for await (const jiraSearchIssue of jiraSearchDataYielder) {
            const issueAsCSV = jiraSearchDataIssueAsCsv(jiraSearchIssue, { maxDescriptionLength: 10 })
            for (
              const transitionCSV of await asyncToArray(
                jiraTransitionDatasAsCsv(extractStateTransitions(jiraSearchIssue)),
              )
            ) {
              yield { ...transitionCSV, ...issueAsCSV }
            }
          }
        }

        await writeCSVToFile(
          join(opts.outputDir, "jira-transitions-data.csv"),
          transformer(yieldJiraSearchIssues),
          { header: filteredHeaders.map((el) => el) },
        )
      })
    }
  }

  yield async () => {
    await timeCtx("jira-search-data", async () => {
      const { fieldKeys, yieldJiraSearchIssues } = await getJiraSearchDataYielder(jc, {
        maxDays: opts.dataTimeframe,
        signal: opts.signal,
        excludeUnusedFields: true,
      })
      const filteredHeaders = jiraSearchDataHeaders({
        fieldKeys,
        excludeHeaders: jira.ignoreHeaders,
        headersOrder: jira.headerOrder,
        includeHeaders: jira.headerOrder,
      })
      await writeCSVToFile(
        join(opts.outputDir, "jira-search-data.csv"),
        jiraSearchDataIssuesAsCsv(yieldJiraSearchIssues, { maxDescriptionLength: 10 }),
        { header: filteredHeaders },
      )
    })
  }
}

export const _internals = {
  getGithubClient,
  getJiraClient,
}

export function YYYYMMDD(date: string): string {
  return new Date(date).toISOString().split("T")[0]
}
