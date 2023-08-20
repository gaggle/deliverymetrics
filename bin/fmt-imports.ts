#!/usr/bin/env deno run

import { handlers, setup as logSetup } from "std:log"

import { formatImportBlocks } from "../utils/format-import-blocks/mod.ts"

import { yargs } from "../cli/yargs.ts"

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
 * Parse args and execute commands
 */
export function parseArgs(args: Array<string>) {
  return yargs(args)
    .scriptName("fmt-imports.ts")
    .usage("Auto-format imports.")
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
    .option("check")
    .boolean("check")
    .describe("check", "Check if the source files are formatted")
    .demandCommand(1, 1)
    .strictCommands()
    .wrap(120)
    .parse()
}

async function* getNames(currentPath: string, opts: { ext?: string } = {}): AsyncGenerator<string> {
  for await (const dirEntry of Deno.readDir(currentPath)) {
    const entryPath = `${currentPath}/${dirEntry.name}`
    if (dirEntry.isDirectory && !entryPath.includes(".git/")) {
      for await (const el of getNames(entryPath, opts)) {
        yield el
      }
    } else if (!opts.ext || entryPath.endsWith(opts.ext)) {
      yield entryPath
    }
  }
}

const args = parseArgs(Deno.args)
const problems: string[] = []
let checkCount = 0

const scanDir = args._[0]
for await (const filepath of getNames(scanDir, { ext: ".ts" })) {
  const content = await Deno.readTextFile(filepath)

  let formatted: string
  try {
    formatted = formatImportBlocks(content)
  } catch (err) {
    console.log(`Error during formatting: ${filepath}`)
    console.log(err)
    Deno.exit(1)
  }
  checkCount += 1
  if (content !== formatted) {
    problems.push(filepath)
    if (!args.check) {
      await Deno.writeTextFile(filepath, formatted)
    }
  }
}
if (args.check) {
  if (problems.length > 0) {
    console.log(`\n${problems.join("\n")}\n\nerror: Found ${problems.length} not formatted file in ${checkCount} files`)
  } else {
    console.log(`Checked imports in ${checkCount} files`)
  }
} else {
  console.log(`Formatted ${problems.length} imports in ${checkCount} files`)
}
