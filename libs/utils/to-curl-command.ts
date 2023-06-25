export function toCurlCommand(request: Request, body?: string): string {
  return inner(request.url, {
    body: body,
    headers: request.headers,
    method: request.method,
  })
}

function inner(url: string, opts: Partial<{ body: string; headers: Headers; method: string }> = {}): string {
  // Start building the cURL command
  let curlCommand = "curl"

  if (opts.method) {
    curlCommand += ` -X ${opts.method.toUpperCase()}`
  }

  curlCommand += ` '${url}'`

  if (opts.headers) {
    for (const key of opts.headers.keys()) {
      curlCommand += ` -H '${key}: ${opts.headers.get(key)}'`
    }
  }

  if (opts.body) {
    curlCommand += ` -d '${opts.body}'`
  }

  return curlCommand
}
