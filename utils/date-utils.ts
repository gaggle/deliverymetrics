/**
 * Creates a JavaScript Date instance for the start of the day
 */
export function dayStart(...args: ConstructorParameters<typeof Date>): Date {
  const d = new Date(...args)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/**
 * Creates a JavaScript Date instance for the end of the day
 */
export function dayEnd(...args: ConstructorParameters<typeof Date>): Date {
  const d = new Date(...args)
  d.setUTCHours(23, 59, 59, 999)
  return d
}

export function weekStart(...args: ConstructorParameters<typeof Date>): Date {
  const d = dayStart(...args)
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() - 1))
  return d
}

export function weekEnd(...args: ConstructorParameters<typeof Date>): Date {
  const d = weekStart(...args)
  d.setUTCDate(d.getUTCDate() + 6)
  return dayEnd(d)
}

export function monthStart(...args: ConstructorParameters<typeof Date>): Date {
  const d = dayStart(...args)
  d.setUTCDate(1)
  return d
}

export function monthEnd(...args: ConstructorParameters<typeof Date>): Date {
  const d = new Date(...args)
  return dayEnd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
}

/**
 * Creates a JavaScript Date instance for the start of the next day
 */
export function nextDayStart(...args: ConstructorParameters<typeof Date>): Date {
  const d = dayStart(...args)
  d.setUTCDate(d.getUTCDate() + 1)
  return d
}

export function toDays(duration: number): number {
  return Math.ceil(duration / (24 * 60 * 60 * 1000))
  //                           hour min  sec  ms;
}

export function toHours(duration: number): number {
  return Math.ceil(duration / (60 * 60 * 1000))
  //                           min  sec  ms;
}

export function toMins(duration: number): number {
  return duration / 1000 / 60
}

export function daysBetween(then: Date, now: Date): number {
  const msBetweenDates = Math.abs(then.getTime() - now.getTime())
  return msBetweenDates / (24 * 60 * 60 * 1000)
  //                       hour min  sec  ms
}
