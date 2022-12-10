import { dirname, fromFileUrl, join, relative } from "path";
import { ensureDir } from "fs";

import { getEnv } from "../utils.ts";
import { JSONValue, RequestMethod } from "../types.ts";

import { FetchSpec, FetchSpecCommand } from "./types.ts";

const metaDir = dirname(fromFileUrl(import.meta.url));

export async function fetchGithubFixtures(
  commands: FetchSpec,
  { token }: { token: string },
): Promise<void> {
  await Promise.all(commands.map((cmd) => {
    const strictCmd: FetchSpecCommand = typeof cmd === "string" ? { url: cmd } : cmd;

    const fixturePath = getFixturePath({
      method: "GET",
      ...strictCmd,
      prefix: "github",
    });
    const req = createGithubRequest({ method: "GET", ...strictCmd, token });
    return fetchFixture(req, fixturePath, { asJson: strictCmd.json !== undefined ? strictCmd.json : true });
  }));
}

export async function fetchJiraFixtures(
  commands: FetchSpec,
): Promise<void> {
  const apiToken = getEnv("JIRA_API_TOKEN");
  const apiUser = getEnv("JIRA_API_USER");

  await Promise.all(commands.map((cmd) => {
    switch (typeof cmd) {
      case "string":
        cmd = { url: cmd };
    }
    const fixturePath = getFixturePath({
      method: "GET",
      ...cmd,
      prefix: "jira",
    });
    const req = createJiraRequest({ method: "GET", ...cmd, apiToken, apiUser });
    return fetchFixture(req, fixturePath);
  }));
}

function getFixturePath(
  {
    method,
    name,
    prefix,
    url,
  }: {
    method: RequestMethod;
    name?: string;
    prefix?: string;
    url: string;
  },
) {
  const uri = new URL(url);
  const pathnameNoLeadingSlash = uri.pathname.slice(1);
  const folderPath = join(metaDir, prefix || "", pathnameNoLeadingSlash);

  let filename: string = method;
  if (name) {
    filename += `.${name}`;
  }
  filename += ".json";

  return join(folderPath, filename);
}

function createJiraRequest(
  {
    apiToken,
    apiUser,
    body,
    method,
    url,
  }: {
    apiToken: string;
    apiUser: string;
    body?: Record<string, string>;
    method: RequestMethod;
    url: string;
  },
): Request {
  const uri = new URL(url);

  return new Request(uri.toString(), {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${btoa(`${apiUser}:${apiToken}`)}`,
    },
    method,
  });
}

function createGithubRequest(
  {
    token,
    body,
    method,
    url,
  }: {
    token: string;
    body?: Record<string, string>;
    method: RequestMethod;
    url: string;
  },
): Request {
  const uri = new URL(url);

  return new Request(uri.toString(), {
    body: JSON.stringify(body),
    headers: {
      "Accept": "Accept: application/vnd.github.v3+json",
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method,
  });
}

async function fetchFixture(
  request: Request,
  filepath: string,
  { asJson }: Partial<{ asJson: boolean }> = {},
): Promise<void> {
  if (await fileExists(filepath)) {
    console.log("Skipped fixture", relative(Deno.cwd(), filepath));
    return;
  }

  // console.log(`Fetching:`, request);
  const response = await fetch(request);
  // console.log("\tFetched:", response);

  let json: JSONValue | undefined;
  let text: string | undefined;
  if (asJson) {
    try {
      json = await response.clone().json();
    } catch (err) {
      console.warn("\tFailed to parse response body as JSON:", err.message);
      text = await response.clone().text();
    }
  } else {
    text = await response.clone().text();
  }

  await ensureDir(dirname(filepath));
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
  );
  console.log("\tWrote fixture", relative(Deno.cwd(), filepath));
}

async function fileExists(filename: string): Promise<boolean> {
  try {
    await Deno.stat(filename);
    return true;
  } catch (error) {
    if (error && error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}
