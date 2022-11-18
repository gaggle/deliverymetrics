export type Epoch = number

export type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

export type DeepPartial<T> = T extends Record<string, unknown> ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export type Filepath = string;

export type Dirpath = string;

type UnionToParm<U> = U extends unknown ? (k: U) => void : never;
type UnionToSect<U> = UnionToParm<U> extends (k: infer I) => void ? I : never;
type ExtractParm<F> = F extends { (a: infer A): void } ? A : never;
type SpliceOne<Union> = Exclude<Union, ExtractOne<Union>>;
type ExtractOne<Union> = ExtractParm<UnionToSect<UnionToParm<Union>>>;
type ToTupleRec<Union, Rslt extends unknown[]> = SpliceOne<Union> extends never
  ? [ExtractOne<Union>, ...Rslt]
  : ToTupleRec<SpliceOne<Union>, [ExtractOne<Union>, ...Rslt]>;

/**
 * Create constant array type from object type.
 *
 * e.g.:
 * ```ts
 * type Obj = { foo: string, bar: number }
 * type Keys:["foo", "bar"] = ToTuple<keyof Obj>
 *
 * ```
 */
export type ToTuple<Union> = ToTupleRec<Union, []>;

export type Tail<T extends unknown[]> = T extends [infer Head, ...infer Tail] ? Tail : never;
