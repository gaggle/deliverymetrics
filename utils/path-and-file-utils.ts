import { z } from "zod"
import { dirname, join, relative, resolve } from "std:path"
import { ensureDir, ensureFile, walk } from "std:fs"

import { JSONValue } from "./types.ts"

import { parseWithZodSchema } from "./mod.ts"

export async function pathExists(p: string): Promise<boolean> {
  try {
    await Deno.stat(p)
    return true
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false
    }
    throw err
  }
}

export async function dirExists(p: string): Promise<boolean> {
  try {
    const fileInfo = await Deno.stat(p)
    return fileInfo.isDirectory
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false
    }
    throw err
  }
}

export async function safeReadTextFile(
  ...args: Parameters<typeof Deno.readTextFile>
): Promise<string | undefined> {
  try {
    const content = await Deno.readTextFile(...args)
    return content
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return Promise.resolve(undefined)
    }
    throw err
  }
}

export async function readJsonFile<Schema extends z.ZodTypeAny>(
  p: string,
  schema: Schema,
): Promise<z.infer<Schema>> {
  const data = await Deno.readTextFile(p)

  let parsed
  try {
    parsed = JSON.parse(data)
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new SyntaxError(`Error parsing '${p}': ${err.message}`)
    }
    throw err
  }
  return parseWithZodSchema(parsed, schema)
}

export async function ensureJson<Schema extends z.ZodTypeAny>(
  fp: string,
  { schema, defaults }: { schema: Schema; defaults: z.infer<Schema> },
): Promise<void> {
  await ensureFile(fp)
  const content = await Deno.readTextFile(fp)

  if (content === "") {
    return Deno.writeTextFile(fp, JSON.stringify(defaults, null, 2))
  }

  let parsed: JSONValue

  try {
    parsed = JSON.parse(content)
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new SyntaxError(
        `Error parsing '${relative(Deno.cwd(), fp)}' got: ${content}`,
      )
    }
    throw err
  }

  const data = schema.safeParse(parsed)
  if (!data.success) {
    throw data.error
  }
}

export async function writeTempFile(
  { data, suffix }: Partial<{ data: string; suffix: string }> = {},
): Promise<string> {
  const fp = await Deno.makeTempFile({ suffix })

  if (data) {
    await Deno.writeTextFile(fp, data)
  }

  return fp
}

export async function withTempFile(
  callable: (fp: string) => void | Promise<void>,
  ...args: Parameters<typeof writeTempFile>
) {
  const fp = await writeTempFile(...args)
  try {
    await callable(fp)
  } finally {
    await Deno.remove(fp, { recursive: true })
  }
}

export async function withTempDir(
  callable: (p: string) => void | Promise<void>,
  { suffix }: Partial<{ suffix: string }> = {},
) {
  const p = await Deno.makeTempDir({ suffix })
  try {
    await callable(p)
  } finally {
    await Deno.remove(p, { recursive: true })
  }
}

export function ensureFiles(
  root: string,
  files: Array<{
    file: string
    data?: string | Record<string, unknown> | Array<Record<string, unknown>>
  }>,
): Promise<Array<string>> {
  return Promise.all(files.map(async ({ file, data }) => {
    data = typeof data !== "string" ? JSON.stringify(data, null, 2) : data
    const fp = join(root, file)

    if (relative(root, fp).indexOf("..") > -1) {
      throw new Error(`File ${resolve(fp)} must be inside root ${root}`)
    }
    // ↑ Too much of a security/accident risk to allow files to end up outside the root,
    //   e.g. because of an errand leading slash.

    await ensureDir(dirname(fp))
    await Deno.writeTextFile(fp, data)
    return fp
  }))
}

export async function withFileOpen(
  callable: (f: Deno.FsFile) => void,
  ...opts: Parameters<typeof Deno.open>
) {
  const f = await Deno.open(...opts)
  try {
    await callable(f)
  } finally {
    f.close()
  }
}

export async function* yieldDir(path: string): AsyncIterable<string> {
  for await (const step of walk(path)) {
    if (step.isFile) {
      yield relative(path, step.path)
    }
  }
}

export function safeReadFileSync(
  ...args: Parameters<typeof Deno.readFileSync>
): ReturnType<typeof Deno.readFileSync> | undefined {
  try {
    return Deno.readFileSync(...args)
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return undefined
    }
    throw err
  }
}
