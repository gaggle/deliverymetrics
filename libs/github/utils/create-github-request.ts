import { RequestMethod } from "../../types.ts"

export function createGithubRequest(
  {
    token,
    body,
    method,
    url,
  }: {
    token?: string
    body?: Record<string, string>
    method: RequestMethod
    url: string
  },
): Request {
  const uri = new URL(url)

  const headers: HeadersInit = {
    "Accept": "Accept: application/vnd.github.v3+json",
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return new Request(uri.toString(), {
    body: JSON.stringify(body),
    headers,
    method,
  })
}
