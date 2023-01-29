import Kia from "kia"

export async function withSpinner(
  callable: () => Promise<unknown>,
  opts?: Partial<{ start: string; succeed: string; delayFor: number }>,
) {
  let kia: Kia | undefined

  const timeout = setTimeout(
    () => kia = new Kia(opts?.start).start(),
    opts?.delayFor,
  )

  try {
    await callable()
  } catch (err: unknown) {
    if (kia) kia.fail()
    throw err
  } finally {
    if (timeout) clearTimeout(timeout)
  }
  if (kia) kia.succeed(opts?.succeed)
}
