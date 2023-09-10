import { flattenObject } from "./utils.ts"

// deno-lint-ignore no-explicit-any
export function getValueByPath(obj: { [key: string]: any }, path: string): any {
  return flattenObject(obj)[path]
}

// deno-lint-ignore no-explicit-any
export function setValueByPath(obj: { [key: string]: any }, path: string, value: any): void {
  const keys = path.split(".")

  keys.reduce((current, key, index) => {
    if (index === keys.length - 1) {
      current[key] = value
    } else {
      if (current[key] === undefined) {
        current[key] = {}
      }
      return current[key]
    }
  }, obj)
}
