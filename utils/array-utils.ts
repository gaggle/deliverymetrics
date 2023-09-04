type ArrayLike<T> = Array<T> | ReadonlyArray<T>

export function arraySubtract<T, U extends T>(
  arr: ArrayLike<T>,
  toSubtract: ArrayLike<U>,
): Array<T> {
  return arr.filter((element) => !toSubtract.includes(element as unknown as U))
}

export function arraySubtractRegEx(arr: Array<string>, toSubtract: Array<string | RegExp>): Array<string> {
  return arr.filter((el: string) => !regexOrStringTestMany(el, toSubtract))
}

export function regexOrStringTestMany(el: string, matches: Array<string | RegExp>): boolean {
  for (const match of matches) {
    if (regexOrStringTest(el, match)) {
      return true
    }
  }
  return false
}

export function regexOrStringTest(el: string, match: string | RegExp): boolean {
  if (match instanceof RegExp) {
    return match.test(el)
  }
  return el === match
}

export function average(nums: number[]): number {
  return nums.reduce((a, b) => (a + b)) / nums.length
}
