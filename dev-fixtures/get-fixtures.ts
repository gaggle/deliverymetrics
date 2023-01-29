import { dirname, join, relative } from "std:path"
import { ensureDir } from "std:fs"

import { JSONValue, RequestMethod } from "../libs/types.ts"

import { FixtureSpec, FixtureSpecs } from "./types.ts"

export async function fetchGithubFixtures(
  fixtureSpecs: FixtureSpecs,
  outputDir: string,
  { token }: { token: string },
): Promise<void> {
  await Promise.all(fixtureSpecs.map((cmd) => {
    const strictCmd: FixtureSpec = typeof cmd === "string" ? { url: cmd } : cmd

    const fixturePath = getFixturePath({ method: "GET", ...strictCmd })
    const req = createGithubRequest({ method: "GET", ...strictCmd, token })
    return fetchFixture(req, {
      outputDir,
      filename: fixturePath,
      asJson: strictCmd.json !== undefined ? strictCmd.json : true,
    })
  }))
}

export async function fetchJiraFixtures(
  fixtureSpecs: FixtureSpecs,
  outputDir: string,
  { token, user }: { token: string; user: string },
): Promise<void> {
  await Promise.all(fixtureSpecs.map((cmd) => {
    const strictCmd: FixtureSpec = typeof cmd === "string" ? { url: cmd } : cmd

    const fixturePath = getFixturePath({ method: "GET", ...strictCmd })
    const req = createJiraRequest({ method: "GET", ...strictCmd, apiToken: token, apiUser: user })
    return fetchFixture(req, {
      outputDir,
      filename: fixturePath,
      asJson: strictCmd.json !== undefined ? strictCmd.json : true,
    })
  }))
}

function getFixturePath(
  { method, name, url }: {
    method: RequestMethod
    name?: string
    url: string
  },
) {
  const uri = new URL(url)
  const folderPath = uri.pathname.slice(1)

  let filename: string = method
  if (name) filename += `.${name}`
  filename += ".json"

  return join(folderPath, filename)
}

function createJiraRequest(
  { apiToken, apiUser, body, method, url }: {
    apiToken: string
    apiUser: string
    body?: Record<string, string>
    method: RequestMethod
    url: string
  },
): Request {
  const uri = new URL(url)

  return new Request(uri.toString(), {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${btoa(`${apiUser}:${apiToken}`)}`,
    },
    method,
  })
}

function createGithubRequest(
  { token, body, method, url }: {
    token: string
    body?: Record<string, string>
    method: RequestMethod
    url: string
  },
): Request {
  const uri = new URL(url)

  return new Request(uri.toString(), {
    body: JSON.stringify(body),
    headers: {
      "Accept": "Accept: application/vnd.github.v3+json",
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method,
  })
}

async function fetchFixture(
  request: Request,
  { asJson, outputDir, filename }: {
    asJson?: boolean
    outputDir: string
    filename: string
  },
): Promise<void> {
  const filepath = join(outputDir, filename)

  if (await fileExists(filepath)) {
    console.log("Skipped fixture", relative(outputDir, filepath))
    return
  }

  // console.log(`Fetching:`, request);
  const response = await fetch(request)
  // console.log("\tFetched:", response);

  let json: JSONValue | undefined
  let text: string | undefined
  if (asJson) {
    try {
      json = await response.clone().json()
    } catch (err) {
      console.warn("\tFailed to parse response body as JSON:", err.message)
      text = await response.clone().text()
    }
  } else {
    text = await response.clone().text()
  }

  await ensureDir(dirname(filepath))
  await Deno.writeTextFile(
    filepath,
    JSON.stringify(
      {
        request: {
          body: request.body,
          headers: Array.from(request.headers.entries()),
          url: request.url,
        },
        response: {
          json,
          text,
          headers: Array.from(response.headers.entries()),
          status: response.status,
          statusText: response.statusText,
        },
      },
      null,
      2,
    ),
  )
  console.log("\tWrote fixture", relative(Deno.cwd(), filepath))
}

async function fileExists(filename: string): Promise<boolean> {
  try {
    await Deno.stat(filename)
    return true
  } catch (error) {
    if (error && error instanceof Deno.errors.NotFound) return false
    throw error
  }
}
