export function dayStart(...args: ConstructorParameters<typeof Date>): Date {
  const d = new Date(...args);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
export function dateEnd(...args: ConstructorParameters<typeof Date>): Date {
  const d = new Date(...args);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
export function nextDate(...args: ConstructorParameters<typeof Date>): Date {
  const d = dayStart(...args);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
export function weekStart(...args: ConstructorParameters<typeof Date>): Date {
  const d = dayStart(...args);
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() - 1));
  return d;
}
export function weekEnd(...args: ConstructorParameters<typeof Date>): Date {
  const d = weekStart(...args);
  d.setUTCDate(d.getUTCDate() + 6);
  return dateEnd(d);
}
export function monthStart(...args: ConstructorParameters<typeof Date>): Date {
  const d = dayStart(...args);
  d.setUTCDate(1);
  return d;
}
export function monthEnd(...args: ConstructorParameters<typeof Date>): Date {
  const d = new Date(...args);
  return dateEnd(new Date(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}
