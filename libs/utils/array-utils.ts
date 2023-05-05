type ArrayLike<T> = Array<T> | ReadonlyArray<T>

export function arraySubtract<T, U extends T>(
  arr: ArrayLike<T>,
  toSubtract: ArrayLike<U>,
): Array<T> {
  return arr.filter((element) => !toSubtract.includes(element as unknown as U))
}

export function arraySubtractRegEx(arr: Array<string>, toSubtract: Array<string | RegExp>): Array<string> {
  return arr.filter((el: string) => {
    for (const sub of toSubtract) {
      if (sub instanceof RegExp) {
        if (sub.test(el)) {
          return false
        }
      } else if (el === sub) {
        return false
      }
    }
    return true
  })
}
