import { makeRunWithLimit as makeLimit } from "run-with-limit"
import { slugify } from "slugify"
import { join } from "std:path"

import { GithubActionRun } from "../../libs/github/api/action-run/mod.ts"
import { GithubActionWorkflow } from "../../libs/github/api/action-workflows/mod.ts"
import { BoundGithubPullCommit } from "../../libs/github/api/pull-commits/mod.ts"
import { sortPullCommitsByKey } from "../../libs/github/github-utils/mod.ts"
import { getGithubClient } from "../../libs/github/mod.ts"
import { getJiraClient } from "../../libs/jira/mod.ts"
import {
  getJiraSearchDataYielder,
  yieldActionData,
  yieldCommitData,
  yieldPullRequestData,
  yieldPullRequestHistogram,
  yieldReleaseData,
  yieldStatsCodeFrequency,
  yieldStatsCommitActivity,
  yieldStatsContributors,
  yieldStatsParticipation,
  yieldStatsPunchCard,
} from "../../libs/metrics/mod.ts"

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
  pullRequestHistogramAsCsv,
  pullRequestHistogramHeaders,
} from "../csv/mod.ts"

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
  host: string
  apiUser: string
  customCompletedDateHeader?: string
  customStartDateHeader?: string
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
      const actionRunGens: Array<AsyncGenerator<{ actionRun: GithubActionRun; workflow: GithubActionWorkflow }>> = []
      await writeCSVToFile(
        join(outputDir, `github-action-workflows-data.csv`),
        githubActionWorkflowAsCsv(
          inspectIter(
            (el) => {
              actionRunGens.push(mapIter((actionRun) => ({
                actionRun: actionRun,
                workflow: el.actionWorkflow,
              }), el.actionRunGenerator))
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

  for (const { mode, maxDays } of yieldHistogramTimeframes()) {
    yield async () => {
      await timeCtx(`${mode} histograms`, async () => {
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

  if (jira.customCompletedDateHeader && jira.customStartDateHeader) {
    yield async () => {
      await timeCtx("jira-focusedobjective-team-dashboard-data", async () => {
        const { yieldJiraSearchIssues } = await getJiraSearchDataYielder(jc, {
          includeStatuses: ["Review in Prod", "Finished", "Blocked", "In Progress"],
          includeTypes: ["Story", "Bug"],
          maxDays: opts.dataTimeframe,
          signal: opts.signal,
          sortBy: { key: "customfield_21123", type: "date" },
        })

        await writeCSVToFile(
          join(opts.outputDir, "jira-focusedobjective-team-dashboard-data.csv"),
          jiraSearchDataIssuesAsCsv(yieldJiraSearchIssues),
          {
            header: [
              jira.customCompletedDateHeader!, // This whole yield only runs when this is present…
              jira.customStartDateHeader!, // This whole yield only runs when this is present…
              "fields.issuetype.name",
              "key",
              "fields.summary",
              "fields.status.name",
            ],
          },
        )
      })
    }
  }

  yield async () => {
    await timeCtx("jira-search-data", async () => {
      const { fieldKeys, fieldKeysToNames, yieldJiraSearchIssues } = await getJiraSearchDataYielder(jc, {
        maxDays: opts.dataTimeframe,
        signal: opts.signal,
      })
      await writeCSVToFile(
        join(opts.outputDir, "jira-search-data.csv"),
        jiraSearchDataIssuesAsCsv(yieldJiraSearchIssues, { maxDescriptionLength: 10 }),
        { header: jiraSearchDataHeaders({ fieldKeys, fieldKeysToNames }) },
      )
    })
  }
}

export const _internals = {
  getGithubClient,
  getJiraClient,
}
