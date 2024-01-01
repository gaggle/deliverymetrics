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

export function toDaysRounded(duration: number): number {
  const durationInHours = duration / (60 * 60 * 1000)
  const fractionalDays = durationInHours / 24

  // Determine rounding threshold
  const roundingThreshold = Math.ceil(fractionalDays) - 0.95

  if (fractionalDays >= roundingThreshold) {
    // Match or exceed threshold: round up to the nearest whole day
    return Math.ceil(fractionalDays)
  } else {
    // Round down to the nearest whole day
    return Math.floor(fractionalDays)
  }
}

export function toHours(duration: number): number {
  return duration / (60 * 60 * 1000)
  //                 min  sec  ms;
}

export function fromHours(duration: number): number {
  return duration * 60 * 60 * 1000
  //                min  sec  ms;
}

export function toHoursRounded(duration: number): number {
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

export function formatDuration(milliseconds: number, opts?: { includeSeconds?: boolean }): string {
  const { includeSeconds = false } = opts || {}

  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  const remainingHours = hours % 24
  const remainingMinutes = minutes % 60
  const remainingSeconds = seconds % 60

  let formattedDuration = ""
  if (days > 0) {
    formattedDuration += `${days}d`
  }
  if (remainingHours > 0) {
    formattedDuration += `${remainingHours}h`
  }
  if (remainingMinutes > 0) {
    formattedDuration += `${remainingMinutes}m`
  }
  if (includeSeconds && remainingSeconds > 0) {
    formattedDuration += `${remainingSeconds}s`
  }

  return formattedDuration || "0m" // Return '0m' if duration is less than a minute
}

export function toISOStringWithoutMs(...args: ConstructorParameters<typeof Date>) {
  return new Date(...args).toISOString().split(".")[0] + "Z"
}
