import { handlers, setup as logSetup } from "std:log"

export const logLevels = ["DEBUG", "INFO", "WARNING"] as const
export type LogLevel = typeof logLevels[number]
export const defaultLogLevel: LogLevel = "INFO"

export function setupLogging(level: LogLevel) {
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
