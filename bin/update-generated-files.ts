#!/usr/bin/env deno run

import { diff } from "diff-kit"
import { handlers, setup as logSetup } from "std:log"
import { zodToJsonSchema } from "zod-to-json-schema"

import { configSchema } from "../cli/configuration/types.ts"
import { yargs } from "../cli/yargs.ts"

import { safeReadTextFile } from "../utils/path-and-file-utils.ts"

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
    .scriptName("update-generated-files.ts")
    .usage("Preparations and checks to run before a release.")
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
    .describe("check", "Exit non-zero if pre-release steps causes any changes")
    .demandCommand(0, 0)
    .strictCommands()
    .wrap(120)
    .parse()
}

async function updateJsonSchema({ check }: Partial<{ check: boolean }> = {}) {
  const jsonSchema = JSON.stringify(zodToJsonSchema(configSchema, "configuration-schema"), null, 2)
  const existingSchema = await safeReadTextFile("configuration-schema.json")

  if (check) {
    if (existingSchema === jsonSchema) {
      console.log("configuration-schema is up-to-date")
    } else {
      let msg = "configuration-schema is out of date"
      if (existingSchema && jsonSchema) msg += `:\n${diff(existingSchema, jsonSchema)}`
      console.error(msg)
      Deno.exit(1)
    }
  } else {
    await Deno.writeTextFile("configuration-schema.json", jsonSchema)
    console.log("Updated configuration-schema.json")
  }
}

const args = parseArgs(Deno.args)

await updateJsonSchema(args)
