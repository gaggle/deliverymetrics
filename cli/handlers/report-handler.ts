import { makeRunWithLimit as makeLimit } from "run-with-limit"
import { slugify } from "slugify"
import { join } from "std:path"

import { GithubActionWorkflow } from "../../libs/github/api/action-workflows/mod.ts"
import { BoundGithubPullCommit } from "../../libs/github/api/pull-commits/mod.ts"
import { sortPullCommitsByKey } from "../../libs/github/github-utils/mod.ts"
import { getGithubClient } from "../../libs/github/mod.ts"
import { getJiraClient, transitionsStatusChangeParser } from "../../libs/jira/mod.ts"
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
  toDaysRounded,
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
  devLeadPlannedStatuses?: string[]
  devLeadInProgressStatuses?: string[]
  devLeadCompletedStatuses?: string[]
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
          includeStatuses: [
            ...jira.devLeadInProgressStatuses || [],
            ...jira.devLeadCompletedStatuses || [],
          ],
          includeTypes: jira.devLeadTimeTypes,
          maxDays: opts.dataTimeframe,
          signal: opts.signal,
          sortBy: { key: completedDateHeader, type: "date" },
        })

        async function* transformer(
          jiraSearchDataYielder: GetJiraSearchDataYielderReturnType["yieldJiraSearchIssues"],
        ) {
          for await (const jiraSearchIssue of jiraSearchDataYielder) {
            const issueAsCSV = jiraSearchDataIssueAsCsv(jiraSearchIssue, { maxDescriptionLength: 10 })

            const explicitStartedField = startDateHeader && startDateHeader in issueAsCSV
              ? issueAsCSV[startDateHeader]
              : "null"
            const explicitCompletedField = completedDateHeader && completedDateHeader in issueAsCSV
              ? issueAsCSV[completedDateHeader]
              : "null"
            // ↑ These come out of the CSV function so are *always* strings,
            //   but if empty might be stringified as "null" so this also falls back to null-string.
            const explicitStartDate = explicitStartedField === "null" ? undefined : YYYYMMDD(explicitStartedField)
            const explicitCompletedDate = explicitCompletedField === "null"
              ? undefined
              : YYYYMMDD(explicitCompletedField)

            const transitions = await asyncToArray(extractStateTransitions(jiraSearchIssue))
            const { inProgress, completed, eventLog } = transitionsStatusChangeParser(transitions, {
              plannedStates: jira.devLeadPlannedStatuses || [],
              inProgressStates: jira.devLeadInProgressStatuses || [],
              completedStates: jira.devLeadCompletedStatuses || [],
            })
            const calculatedStartDate = inProgress ? YYYYMMDD(new Date(inProgress).toISOString()) : undefined
            const calculatedCompletedDate = completed ? YYYYMMDD(new Date(completed).toISOString()) : undefined

            const completedDate = explicitCompletedDate || calculatedCompletedDate
            const startDate = explicitStartDate || calculatedStartDate

            if (completedDate && !startDate) {
              // This must have been moved directly into done. Does that mean it got completed, or never worked on?
              continue
            }

            yield {
              "Completed Date": completedDate || "null",
              "Start Date": startDate || "null",
              "Type": issueAsCSV["fields.Issue Type.name"],
              "Key": issueAsCSV["key"],
              "Summary": issueAsCSV["fields.Summary"],
              "Status": issueAsCSV["fields.Status.name"],
              "Parent Key": issueAsCSV["fields.Parent.key"] || "null",
              "Parent Summary": issueAsCSV["fields.Parent.fields.summary"] || "null",
              "Components": issueAsCSV["Component Names"],
              "Explicit Start Date": explicitStartDate || "null",
              "Explicit Completed Date": explicitCompletedDate || "null",
              "Calculated Start Date": calculatedStartDate || "null",
              "Calculated Completed Date": calculatedCompletedDate || "null",
              "Cycle Time": toDaysRounded(
                new Date(completedDate || new Date()).getTime() - new Date(startDate!).getTime(),
              ).toString(),
              "Transitions": eventLog.join("; "),
            }
          }
        }

        await writeCSVToFile(
          join(opts.outputDir, "jira-focusedobjective-team-dashboard-data.csv"),
          await sortAsyncGenerator(
            transformer(yieldJiraSearchIssues),
            (a, b) => a["Completed Date"] === "null" ? 1 : b["Completed Date"] === "null" ? -1 : 0,
          ),
          {
            header: [
              "Completed Date",
              "Start Date",
              "Type",
              "Key",
              "Summary",
              "Status",
              "Parent Key",
              "Parent Summary",
              "Components",
              "Explicit Start Date",
              "Calculated Start Date",
              "Explicit Completed Date",
              "Calculated Completed Date",
              "Cycle Time",
              "Transitions",
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
  const d = new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
}

async function sortAsyncGenerator<T>(
  iter: AsyncGenerator<T>,
  compareFn: (a: T, b: T) => number,
): Promise<AsyncGenerator<T, unknown, unknown>> {
  const array = await asyncToArray(iter)
  array.sort(compareFn)
  return arrayToAsyncGenerator(array)
}
