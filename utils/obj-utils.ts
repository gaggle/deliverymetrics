// deno-lint-ignore no-explicit-any
export function getValueByPath(obj: { [key: string]: any }, path: string): any {
  const keys = path.split(".")

  return keys.reduce((current, key, index) => {
    if (current[key] === undefined) {
      if (index === keys.length - 1) {
        return undefined
      } else {
        throw new TypeError(`Cannot read properties of undefined (reading '${keys[index + 1]}')`)
      }
    }
    return current[key]
  }, obj)
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
