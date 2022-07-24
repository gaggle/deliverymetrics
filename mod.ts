import { githubSyncHandler, outputToCsv } from "./cli-handlers/mod.ts";
import { parseGithubUrl } from "./github/mod.ts";

import { log, yargs, YargsArguments, YargsInstance, } from "./deps.ts";

const logLevels = ["DEBUG", "INFO", "WARNING"] as const;
type LogLevel = typeof logLevels[number]
const defaultLogLevel: LogLevel = "INFO";

function setupLogging(level: LogLevel) {
  log.setup({
    handlers: {
      console: new log.handlers.ConsoleHandler("DEBUG")
    },
    loggers: {
      default: {
        level,
        handlers: ["console"]
      }
    }
  });
}

yargs(Deno.args)
  .scriptName("dm")

  .option("loglevel").describe("loglevel", `one of ${logLevels.join(", ")}, defaults to ${defaultLogLevel}`)
  .choices("loglevel", logLevels).default("loglevel", defaultLogLevel)
  .coerce("loglevel", (loglevel: LogLevel) => {
    setupLogging(loglevel);
    return loglevel;
  })

  .command("pull github <repo-id> <token>", "Pull data from Github",
    (inst: YargsInstance) => {
      inst.positional("repo-id", { describe: "Repository identifier, e.g: octokit/octokit.js", type: "string" });
      inst.positional("token", {
        describe: "GitHub Personal Access Token, one can be created at https://github.com/settings/tokens",
        type: "string"
      });
    },
    async (argv: YargsArguments & { repoId: string, token: string }) => await githubSyncHandler({
      ...(parseGithubUrl(argv.repoId)),
      token: argv.token,
      root: Deno.cwd()
    })
  )

  .command("output csv <output> <repo-id>", "Output synced data to csv",
    (inst: YargsInstance) => {
      inst.positional("output", { describe: "Output csv path, e.g.: ./output.csv", type: "string" });
      inst.positional("repo-id", { describe: "Repository identifier, e.g: octokit/octokit.js", type: "string" });
    },
    async (argv: YargsArguments & { output: string, repoId: string }) =>
      await outputToCsv({
        github: parseGithubUrl(argv.repoId),
        output: argv.output,
        root: Deno.cwd(),
      })
  )

  .strictCommands()
  .demandCommand(1)
  .parse();
