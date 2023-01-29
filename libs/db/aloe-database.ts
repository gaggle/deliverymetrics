import { Acceptable, Database, Document } from "aloedb"
import { debug } from "std:log"
import { dirname } from "std:path"
import { ensureDir } from "std:fs"
import { Schema as ZodSchema } from "zod"

import type { Filepath } from "../types.ts"

type DatabaseDocument = Document & { _id?: never }

class BaseAloeDatabase<Schema extends DatabaseDocument> {
  protected isLoaded = false
  protected readonly db: Database<Acceptable<Schema>>

  protected constructor(
    { path: fp, schema }: {
      path: Filepath | undefined
      schema: ZodSchema<Schema>
    },
  ) {
    this.db = new Database<Acceptable<Schema>>({
      path: fp,
      validator: schema.parse,
      autoload: false,
      autosave: false,
      optimize: false,
    })
    debug(`Created new database: ${fp}`)
  }

  async save(): Promise<void> {
    await this.load()
    return this.db.save()
  }

  protected async load(): Promise<void> {
    if (this.isLoaded === false) {
      await this.db.load()
      this.isLoaded = true
    }
  }

  async count(
    ...args: Parameters<Database<Acceptable<Schema>>["count"]>
  ): ReturnType<Database<Acceptable<Schema>>["count"]> {
    await this.load()
    return this.db.count(...args)
  }

  async findOne(
    ...args: Parameters<Database<Acceptable<Schema>>["findOne"]>
  ): ReturnType<Database<Acceptable<Schema>>["findOne"]> {
    await this.load()
    return this.db.findOne(...args)
  }

  async findMany(
    ...args: Parameters<Database<Acceptable<Schema>>["findMany"]>
  ): ReturnType<Database<Acceptable<Schema>>["findMany"]> {
    await this.load()
    return this.db.findMany(...args)
  }

  async insertOne(
    ...args: Parameters<Database<Acceptable<Schema>>["insertOne"]>
  ): ReturnType<Database<Acceptable<Schema>>["insertOne"]> {
    await this.load()
    return this.db.insertOne(...args)
  }

  async insertMany(
    ...args: Parameters<Database<Acceptable<Schema>>["insertMany"]>
  ): ReturnType<Database<Acceptable<Schema>>["insertMany"]> {
    await this.load()
    return this.db.insertMany(...args)
  }

  async updateOne(
    ...args: Parameters<Database<Acceptable<Schema>>["updateOne"]>
  ): ReturnType<Database<Acceptable<Schema>>["updateOne"]> {
    await this.load()
    return this.db.updateOne(...args)
  }

  async deleteOne(
    ...args: Parameters<Database<Acceptable<Schema>>["deleteOne"]>
  ): ReturnType<Database<Acceptable<Schema>>["deleteOne"]> {
    await this.load()
    return this.db.deleteOne(...args)
  }

  async deleteMany(
    ...args: Parameters<Database<Acceptable<Schema>>["deleteMany"]>
  ): ReturnType<Database<Acceptable<Schema>>["deleteMany"]> {
    await this.load()
    return this.db.deleteMany(...args)
  }
}

export class AloeDatabase<Schema extends DatabaseDocument> extends BaseAloeDatabase<Schema> {
  static async new<Schema extends DatabaseDocument>(
    { path: fp, schema }: {
      path: Filepath | undefined
      schema: ZodSchema<Schema>
    },
  ): Promise<AloeDatabase<Schema>> {
    if (fp !== undefined) {
      await ensureDir(dirname(fp))
    }
    return new AloeDatabase<Schema>({ path: fp, schema })
  }
}

export class MockAloeDatabase<Schema extends DatabaseDocument> extends BaseAloeDatabase<Schema> {
  protected constructor(schema: ZodSchema<Schema>) {
    super({ path: undefined, schema })
  }

  static async new<Schema extends DatabaseDocument>(
    { schema, documents = [] }: {
      schema: ZodSchema<Schema>
      documents?: Array<Acceptable<Schema>>
    },
  ): Promise<MockAloeDatabase<Schema>> {
    const db = new MockAloeDatabase<Schema>(schema)
    await db.load()
    await db.insertMany(documents)
    return db
  }
}
