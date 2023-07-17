import { handlers, setup as logSetup } from "std:log"
import { dirname, join, resolve } from "std:path"

import { isRegexLike, parseRegexLike } from "../libs/utils/mod.ts"
import { parseGithubUrl } from "../libs/github/mod.ts"

import { yargs, YargsArguments, YargsInstance } from "../cli/yargs.ts"

import { reportHandler, ReportSpec, syncHandler, SyncSpec } from "./handlers/mod.ts"
import { GithubSync, JiraSync, loadConfiguration } from "./configuration/mod.ts"

const logLevels = ["DEBUG", "INFO", "WARNING"] as const
type LogLevel = typeof logLevels[number]
const defaultLogLevel: LogLevel = "INFO"

function setupLogging(level: LogLevel) {
  logSetup({
    handlers: {
      console: new handlers.ConsoleHandler("DEBUG"),
    },
    loggers: {
      default: {
        level,
        handlers: ["console"],
      },
    },
  })
}

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
    .scriptName("dm")
    .option("cache", {
      default: join(Deno.cwd(), ".deliverymetrics-data"),
      describe: "Where to store cached information from syncing",
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
            searchQuery: el.search_query,
            host: el.host,
            apiUser: el.api_user,
            apiToken: el.api_token,
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
      },
      async (argv: YargsArguments & { config: ReturnType<typeof loadConfiguration>; cache: string }) => {
        const configReport = argv.config.report

        if (!configReport) {
          console.error("No report configuration found in config file")
          Deno.exit(1)
        }

        const githubSync = argv.config.sync.github
        const jiraSync = argv.config.sync.jira

        const { signal } = interceptSigint()

        const reportSpec: ReportSpec = {
          cacheRoot: argv.cache,
          outputDir: resolve(dirname(argv.config.fp), configReport.outdir),
          signal,
        }

        if (githubSync) {
          reportSpec.github = {
            ...parseGithubUrl(githubSync.repo),
            actionRuns: {
              branch: configReport.github?.actionRuns?.branch,
              headerOrder: parseRegexLikeStringArray(configReport.github?.actionRuns?.header_order || []),
              ignoreHeaders: parseRegexLikeStringArray(configReport.github?.actionRuns?.ignore_headers || []),
            },
            actionWorkflows: {
              headerOrder: parseRegexLikeStringArray(configReport.github?.actionWorkflows?.header_order || []),
              ignoreHeaders: parseRegexLikeStringArray(configReport.github?.actionWorkflows?.ignore_headers || []),
            },
            pullCommits: {
              headerOrder: parseRegexLikeStringArray(configReport.github?.pullCommits?.header_order || []),
              ignoreHeaders: parseRegexLikeStringArray(configReport.github?.pullCommits?.ignore_headers || []),
            },
            pulls: {
              headerOrder: parseRegexLikeStringArray(configReport.github?.pulls?.header_order || []),
              ignoreHeaders: parseRegexLikeStringArray(configReport.github?.pulls?.ignore_headers || []),
              ignoreLabels: configReport.github?.pulls?.ignore_labels || [],
              includeCancelled: configReport.github?.pulls?.include_cancelled || false,
            },
          }
        }

        if (jiraSync) {
          reportSpec.jira = {
            apiUser: jiraSync.api_user,
            host: jiraSync.host,
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
