import { githubSyncHandler, outputToCsv } from "./cli-handlers/mod.ts";
import { parseGithubUrl } from "./github/mod.ts";

import { fs, log, path, yargs, YargsArguments, YargsInstance, } from "./deps.ts";

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

  .command("output <format> <output-dir> <repo-id>", "Output synced data, generating metrics and reports",
    (inst: YargsInstance) => {
      inst.positional("format", { describe: `Output format, e.g.: csv`, type: "string", choices: ["csv"] });
      inst.positional("output-dir", {
        describe: "Output directory, e.g.: ./output", type: "string", normalize: true, coerce: async (arg: string) => {
          const resolved = path.resolve(path.normalize(arg));
          await fs.ensureDir(resolved);

          // Test write access
          const f = await Deno.makeTempFile({ dir: resolved });
          await Deno.remove(f);

          return resolved;
        }
      });
      inst.positional("repo-id", { describe: "Repository identifier, e.g: octokit/octokit.js", type: "string" });
    },
    async (argv: YargsArguments & { format: string, outputDir: string, repoId: string }) => {
      await outputToCsv({
        github: parseGithubUrl(argv.repoId),
        now: new Date(),
        outputDir: argv.outputDir,
        root: Deno.cwd(),
      });
    }
  )

  .strictCommands()
  .demandCommand(1)
  .parse();
