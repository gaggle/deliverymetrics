/**
 * Based on https://github.com/causaly/zod-validation-error
 */
import * as z from "zod"

type NonEmptyArray<T> = [T, ...T[]]

export function stringifyZodError(
  zodIssues: z.ZodIssue[],
  options: Partial<{
    maxIssuesInMessage: number
    issueSeparator: string
    unionSeparator: string
    prefixSeparator: string
    prefix: string
  }> = {},
): string {
  const {
    maxIssuesInMessage = 99,
    issueSeparator = "; ",
    unionSeparator = ", or ",
    prefixSeparator = ": ",
    prefix = "Validation error",
  } = options

  const reason = zodIssues
    // limit max number of issues printed in the reason section
    .slice(0, maxIssuesInMessage)
    // format error message
    .map((issue) => stringifyZodIssue(issue, issueSeparator, unionSeparator))
    // concat as string
    .join(issueSeparator)

  return reason ? [prefix, reason].join(prefixSeparator) : prefix
}

function stringifyZodIssue(
  issue: z.ZodIssue,
  issueSeparator: string,
  unionSeparator: string,
): string {
  if (issue.code === "invalid_union") {
    return issue.unionErrors
      .reduce<string[]>((acc, zodError) => {
        const newIssues = zodError.issues
          .map((issue) => stringifyZodIssue(issue, issueSeparator, unionSeparator))
          .join(issueSeparator)

        if (!acc.includes(newIssues)) {
          acc.push(newIssues)
        }

        return acc
      }, [])
      .join(unionSeparator)
  }

  if (isNonEmptyArray(issue.path)) {
    // handle array indices
    if (issue.path.length === 1) {
      const identifier = issue.path[0]

      if (typeof identifier === "number") {
        return `${issue.message} at index ${identifier}`
      }
    }

    return `${issue.message} at "${joinPath(issue.path)}"`
  }

  return issue.message
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#identifiers
 */
const identifierRegex = /[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*/u

function joinPath(path: NonEmptyArray<string | number>): string {
  if (path.length === 1) {
    return path[0].toString()
  }

  return path.reduce<string>((acc, item) => {
    // handle numeric indices
    if (typeof item === "number") {
      return acc + "[" + item.toString() + "]"
    }

    // handle quoted values
    if (item.includes('"')) {
      return acc + '["' + escapeQuotes(item) + '"]'
    }

    // handle special characters
    if (!identifierRegex.test(item)) {
      return acc + '["' + item + '"]'
    }

    // handle normal values
    const separator = acc.length === 0 ? "" : "."
    return acc + separator + item
  }, "")
}

function escapeQuotes(str: string): string {
  return str.replace(/"/g, '\\"')
}

function isNonEmptyArray<T>(value: T[]): value is NonEmptyArray<T> {
  return value.length !== 0
}
