export type Epoch = number

export type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>

export type DeepPartial<T> = T extends Record<string, unknown> ? {
    [P in keyof T]?: DeepPartial<T[P]>
  }
  : T

export type Filepath = string

export type Dirpath = string

type UnionToParm<U> = U extends unknown ? (k: U) => void : never
type UnionToSect<U> = UnionToParm<U> extends (k: infer I) => void ? I : never
type ExtractParm<F> = F extends { (a: infer A): void } ? A : never
type SpliceOne<Union> = Exclude<Union, ExtractOne<Union>>
type ExtractOne<Union> = ExtractParm<UnionToSect<UnionToParm<Union>>>
type ToTupleRec<Union, Result extends unknown[]> = SpliceOne<Union> extends never ? [ExtractOne<Union>, ...Result]
  : ToTupleRec<SpliceOne<Union>, [ExtractOne<Union>, ...Result]>

/**
 * Create constant array type from object type.
 *
 * e.g.:
 * ```ts
 * type Obj = { foo: string, bar: number }
 * type Keys = ToTuple<keyof Obj>
 * ToTuple<keyof Obj> === ["foo", "bar"]
 * ```
 */
export type ToTuple<Union> = ToTupleRec<Union, []>

export type Tail<T extends unknown[]> = T extends [infer Head, ...infer Tail] ? Tail
  : never

export type RequestMethod = "GET" | "POST"

export type WithRequired<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: T[P] }

export type WithOptional<T, K extends keyof T> = Omit<T, K> & { [P in K]+?: T[P] }

export type Entries<T> = {
  [K in keyof T]: [K, T[K]]
}[keyof T][]
