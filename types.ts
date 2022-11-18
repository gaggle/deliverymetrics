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
