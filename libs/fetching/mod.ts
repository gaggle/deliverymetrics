export type { ExponentialRetrier, RateLimitExponentialRetrier, SimpleRetrier } from "./types.ts"
export { fetchExhaustively } from "./fetch-exhaustively.ts"
export { retrierFactory } from "./retrier-factory.ts"

import { retrierFactory } from "./retrier-factory.ts"
export type Retrier = ReturnType<typeof retrierFactory>
