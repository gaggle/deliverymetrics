import { ensureDir } from "std:fs";
import { handlers, setup as logSetup } from "std:log";
import { join, normalize, resolve } from "std:path";
import { yargs, YargsArguments, YargsInstance } from "yargs";

import { githubSyncHandler, outputToCsv } from "./cli-handlers/mod.ts";
import { parseGithubUrl } from "./github/mod.ts";

const logLevels = ["DEBUG", "INFO", "WARNING"] as const;
type LogLevel = typeof logLevels[number];
const defaultLogLevel: LogLevel = "INFO";

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
  });
}

/** Where to pull to/read from cached data? */
const persistenceRoot = join(Deno.cwd(), ".deliverymetrics-data");

yargs(Deno.args)
  .scriptName("dm")
  .option("loglevel").describe(
    "loglevel",
    `One of ${logLevels.join(", ")}, defaults to ${defaultLogLevel}`,
  )
  .choices("loglevel", logLevels).default("loglevel", defaultLogLevel)
  .coerce("loglevel", (loglevel: LogLevel) => {
    setupLogging(loglevel);
    return loglevel;
  })
  .command(
    "pull github <repo-id> <token> [--max-days]",
    "Pull data from Github",
    (inst: YargsInstance) => {
      inst.positional("repo-id", {
        describe: "Repository identifier, e.g: octokit/octokit.js",
        type: "string",
        coerce: (repoId: string) => parseGithubUrl(repoId),
      });
      inst.positional("token", {
        describe: "GitHub Personal Access Token, one can be created at https://github.com/settings/tokens",
        type: "string",
      });
      inst.option("max-days", {
        default: 90,
        describe: "Max number of days back to sync for the initial sync",
        type: "number",
        coerce: (maxDays: number) => {
          if (isNaN(maxDays)) {
            throw new Error(`--max-days must be a number, got: ${maxDays}`);
          }
          return maxDays;
        },
      });
    },
    async (
      argv: YargsArguments & {
        repoId: ReturnType<typeof parseGithubUrl>;
        token: string;
        maxDays: number;
      },
    ) => {
      await githubSyncHandler({
        ...argv.repoId,
        token: argv.token,
        maxDays: argv.maxDays,
        persistenceRoot,
      });
    },
  )
  .command(
    "output <format> <output-dir> <repo-id>",
    "Output synced data, generating metrics and reports",
    (inst: YargsInstance) => {
      inst.positional("format", {
        describe: `Output format, e.g.: csv`,
        type: "string",
        choices: ["csv"],
      });
      inst.positional("output-dir", {
        describe: "Output directory, e.g.: ./output",
        type: "string",
        normalize: true,
        coerce: async (arg: string) => {
          const resolved = resolve(normalize(arg));
          await ensureDir(resolved);

          // Test write access
          const f = await Deno.makeTempFile({ dir: resolved });
          await Deno.remove(f);

          return resolved;
        },
      });
      inst.positional("repo-id", {
        describe: "Repository identifier, e.g: octokit/octokit.js",
        type: "string",
      });
    },
    async (
      argv: YargsArguments & {
        format: string;
        outputDir: string;
        repoId: string;
      },
    ) => {
      await outputToCsv({
        github: parseGithubUrl(argv.repoId),
        outputDir: argv.outputDir,
        persistenceRoot,
      });
    },
  )
  .strictCommands()
  .demandCommand(1)
  .wrap(120)
  .parse();
