import { dirname, join, resolve } from "std:path"

import { parseGithubUrl } from "../libs/github/mod.ts"

import { isRegexLike, parseRegexLike } from "../utils/mod.ts"

import { yargs, YargsArguments, YargsInstance } from "../cli/yargs.ts"

import { defaultLogLevel, LogLevel, logLevels, setupLogging } from "../utils/logging.ts"

import { GithubSync, JiraSync, loadConfiguration } from "./configuration/mod.ts"

import { reportHandler, ReportSpec, syncHandler, SyncSpec } from "./handlers/mod.ts"

import { version } from "./version.ts"

const ver = await version()

/**
 * Global counter of SIGINT attempts
 */
let sigints = 0

function interceptSigint() {
  const abortController = new AbortController()
  Deno.addSignalListener("SIGINT", () => {
    sigints += 1

    if (sigints > 1) {
      Deno.exit(2)
    }
    console.log(" Shutting down...")
    abortController.abort()
  })
  return { signal: abortController.signal }
}

/**
 * Parse args and execute commands
 */
export function main(args: Array<string>) {
  yargs(args)
    .scriptName("deliverymetrics")
    .version(ver)
    .option("cache", {
      default: join(Deno.cwd(), ".deliverymetrics-data"),
      describe: "Where to store cached sync data",
      type: "string",
    })
    .option("loglevel")
    .describe(
      "loglevel",
      `One of ${logLevels.join(", ")}, defaults to ${defaultLogLevel}`,
    )
    .choices("loglevel", logLevels).default("loglevel", defaultLogLevel)
    .coerce("loglevel", (loglevel: LogLevel) => {
      setupLogging(loglevel)
      return loglevel
    })
    .command(
      "sync",
      "Sync data as specified in configuration file",
      (inst: YargsInstance) => {
        inst.option("config", {
          alias: "c",
          default: undefined,
          describe: "Configuration file for what and how to sync, defaults: dm.json, dm.jsonc",
          type: "string",
          coerce: (fp: string) => loadConfiguration(fp, ["dm.json", "dm.jsonc"]),
        })
      },
      async (argv: YargsArguments & { config: ReturnType<typeof loadConfiguration>; cache: string }) => {
        const { signal } = interceptSigint()

        const syncSpecs: Array<SyncSpec> = []

        const xformGitHubToSyncSpec = (el: GithubSync): SyncSpec => {
          const { owner, repo } = parseGithubUrl(el.repo)
          return {
            type: "github",
            owner,
            repo,
            token: el.token,
            maxDays: el.max_days === "Infinity" ? undefined : el.max_days || 90,
            //                                    ↑ no max days means infinite days 👍
          }
        }
        if (argv.config.sync?.github) {
          syncSpecs.push(xformGitHubToSyncSpec(argv.config.sync.github))
        }
        const xformJiraToSyncSpec = (el: JiraSync): SyncSpec => {
          return {
            type: "jira",
            credentials: {
              apiToken: el.api_token,
              apiUser: el.api_user,
              host: el.host,
            },
            search: {
              key: el.project_key,
              syncSubtasks: el.sync_subtasks || false,
            },
            maxDays: el.max_days === "Infinity" ? undefined : el.max_days || 90,
            //                                    ↑ no max days means infinite days 👍
          }
        }
        if (argv.config.sync?.jira) {
          syncSpecs.push(xformJiraToSyncSpec(argv.config.sync.jira))
        }

        await syncHandler({
          cacheRoot: argv.cache,
          signal,
          syncSpecs,
        })
        if (sigints > 0) {
          Deno.exit(1)
        }
      },
    )
    .command(
      "report",
      "Generate report as specified in configuration file",
      (inst: YargsInstance) => {
        inst.option("config", {
          alias: "c",
          default: undefined,
          describe: "Configuration file for what and how to sync, defaults: dm.json, dm.jsonc",
          type: "string",
          coerce: (fp: string) => loadConfiguration(fp, ["dm.json", "dm.jsonc"]),
        })
        inst.option("skip-github", { describe: "Skip GitHub reporting", type: "boolean", default: false })
        inst.option("skip-jira", { describe: "Skip Jira reporting", type: "boolean", default: false })
      },
      async (
        argv: YargsArguments & {
          config: ReturnType<typeof loadConfiguration>
          cache: string
          skipGithub: boolean
          skipJira: boolean
        },
      ) => {
        const configReport = argv.config.report

        if (!configReport) {
          console.error("No report configuration found in config file")
          Deno.exit(1)
        }

        const githubSync = argv.skipGithub ? undefined : argv.config.sync.github
        const jiraSync = argv.skipJira ? undefined : argv.config.sync.jira

        const { signal } = interceptSigint()

        const reportSpec: ReportSpec = {
          cacheRoot: argv.cache,
          outputDir: resolve(dirname(argv.config.fp), configReport.outdir),
          signal,
        }

        if (githubSync) {
          const githubReport = configReport.github
          reportSpec.github = {
            ...parseGithubUrl(githubSync.repo),
            actionRuns: {
              branch: githubReport?.actionRuns?.branch,
              headerOrder: parseRegexLikeStringArray(githubReport?.actionRuns?.header_order || []),
              ignoreHeaders: parseRegexLikeStringArray(githubReport?.actionRuns?.ignore_headers || []),
              workflow: githubReport?.actionRuns?.workflow,
            },
            actionWorkflows: {
              headerOrder: parseRegexLikeStringArray(githubReport?.actionWorkflows?.header_order || []),
              ignoreHeaders: parseRegexLikeStringArray(githubReport?.actionWorkflows?.ignore_headers || []),
            },
            pullCommits: {
              headerOrder: parseRegexLikeStringArray(githubReport?.pullCommits?.header_order || []),
              ignoreHeaders: parseRegexLikeStringArray(githubReport?.pullCommits?.ignore_headers || []),
            },
            pulls: {
              headerOrder: parseRegexLikeStringArray(githubReport?.pulls?.header_order || []),
              ignoreHeaders: parseRegexLikeStringArray(githubReport?.pulls?.ignore_headers || []),
              ignoreLabels: githubReport?.pulls?.ignore_labels || [],
              includeCancelled: githubReport?.pulls?.include_cancelled || false,
            },
          }
        }

        if (jiraSync) {
          const jiraReport = configReport.jira
          reportSpec.jira = {
            apiUser: jiraSync.api_user,
            completedDateHeader: jiraReport?.completed_date_header,
            devLeadTimeStatuses: jiraReport?.dev_lead_time_statuses,
            devLeadTimeTypes: jiraReport?.dev_lead_time_types,
            headerOrder: parseRegexLikeStringArray(jiraReport?.header_order || []),
            host: jiraSync.host,
            ignoreHeaders: parseRegexLikeStringArray(jiraReport?.ignore_headers || []),
            startDateHeader: jiraReport?.start_date_header,
          }
        }

        await reportHandler(reportSpec)
        if (sigints > 0) {
          Deno.exit(1)
        }
      },
    )
    .strictCommands()
    .demandCommand(1)
    .wrap(120)
    .parse()
}

/**
 * Takes an array of strings and returns a new array where each element
 * is either a string or a RegExp object.
 *
 * If an element in the input array matches the format of a regular expression string
 * (i.e., starts and ends with a forward slash),
 * it will be converted to a RegExp object.
 * Otherwise, the original string will be used.
 *
 * @example
 * parseRegexLikeStringArray(['/abc/', 'def', '/^123$/']);
 * // Returns: [RegExp(/abc/), 'def', RegExp(/^123$/)]
 */
function parseRegexLikeStringArray(inputStrings: Array<string>): Array<string | RegExp> {
  return inputStrings.map((str: string) => isRegexLike(str) ? parseRegexLike(str) : str)
}
