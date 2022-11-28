import { RequestMethod } from "../../types.ts";

export function createGithubRequest(
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
