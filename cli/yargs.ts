import * as yargsFactory from "https://deno.land/x/yargs@v17.7.2-deno/build/lib/yargs-factory.js"
import * as yargsTypes from "https://deno.land/x/yargs@v17.7.2-deno/deno-types.ts"
import yargs from "https://deno.land/x/yargs@v17.7.2-deno/deno.ts"

type YargsArguments = yargsTypes.Arguments
type YargsInstance = yargsFactory.YargsInstance

export { yargs }
export type { YargsArguments, YargsInstance }
