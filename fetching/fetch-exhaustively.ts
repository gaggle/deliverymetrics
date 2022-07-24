import { log } from "../deps.ts";

/**
 * Copied from https://github.com/SamVerschueren/github-parse-link/blob/master/index.js
 */
export function parseLink(link: string): Record<string, string> {
  return link.split(", ").reduce(function (acc, curr) {
    const match = curr.match("<(.*?)>; rel=\"(.*?)\"");

    if (match && match.length === 3) {
      acc[match[2]] = match[1];
    }

    return acc;
  }, {} as Record<string, string>);
}
export async function * fetchExhaustively(request: Request, opts: { fetchLike?: typeof fetch, maxPages?: number } = {}): AsyncGenerator<Response> {
  const { fetchLike, maxPages } = {
    fetchLike: fetch,
    maxPages: 100,
    ...opts
  };

  let currentRequest: Request | undefined = request;
  let pagesConsumed = 1;

  do {
    const resp = await fetchLike(currentRequest);
    if (pagesConsumed > 1) {
      log.debug(`Fetched page ${pagesConsumed}\n  via ${request.url}\n  -> ${currentRequest.url}`);
    }
    yield resp;

    const link = parseLink(resp.headers.get("Link") || "");
    if (link.next) {
      currentRequest = new Request(link.next, currentRequest);
    } else {
      currentRequest = undefined;
    }

    if (pagesConsumed > maxPages) {
      throw new Error(`Cannot fetch exhaustively more than ${maxPages} pages`);
    }
    pagesConsumed++;
  } while (currentRequest);
}
