export class AbortError extends Error {
}

export class FetchError extends Error {
  error: Error
  request: Request
  response?: Response
  constructor(error: Error, request: Request, response?: Response) {
    super(`FetchError due to: ${error}`)
    this.error = error
    this.request = request
    this.response = response
  }
}
