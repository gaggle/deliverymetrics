import { Acceptable, Database, Document } from "aloedb";
import { dirname } from "path";
import { ensureDir } from "fs";
import { Schema as ZodSchema } from "zod";

import type { Filepath } from "../types.ts";

type DatabaseDocument = Document & { _id?: never };

class BaseAloeDatabase<Schema extends DatabaseDocument> {
  protected db: Database<Acceptable<Schema>>;

  protected constructor(
    { path: fp, schema }: {
      path: Filepath | undefined;
      schema: ZodSchema<Schema>;
    },
  ) {
    this.db = new Database<Acceptable<Schema>>({
      path: fp,
      validator: schema.parse,
    });
  }

  count(
    ...args: Parameters<Database<Acceptable<Schema>>["count"]>
  ): ReturnType<Database<Acceptable<Schema>>["count"]> {
    return this.db.count(...args);
  }

  findOne(
    ...args: Parameters<Database<Acceptable<Schema>>["findOne"]>
  ): ReturnType<Database<Acceptable<Schema>>["findOne"]> {
    return this.db.findOne(...args);
  }

  findMany(
    ...args: Parameters<Database<Acceptable<Schema>>["findMany"]>
  ): ReturnType<Database<Acceptable<Schema>>["findMany"]> {
    return this.db.findMany(...args);
  }

  insertOne(
    ...args: Parameters<Database<Acceptable<Schema>>["insertOne"]>
  ): ReturnType<Database<Acceptable<Schema>>["insertOne"]> {
    return this.db.insertOne(...args);
  }

  insertMany(
    ...args: Parameters<Database<Acceptable<Schema>>["insertMany"]>
  ): ReturnType<Database<Acceptable<Schema>>["insertMany"]> {
    return this.db.insertMany(...args);
  }

  updateOne(
    ...args: Parameters<Database<Acceptable<Schema>>["updateOne"]>
  ): ReturnType<Database<Acceptable<Schema>>["updateOne"]> {
    return this.db.updateOne(...args);
  }
}

export class AloeDatabase<Schema extends DatabaseDocument> extends BaseAloeDatabase<Schema> {
  static async new<Schema extends DatabaseDocument>(
    { path: fp, schema }: {
      path: Filepath | undefined;
      schema: ZodSchema<Schema>;
    },
  ): Promise<AloeDatabase<Schema>> {
    if (fp !== undefined) {
      await ensureDir(dirname(fp));
    }
    return new AloeDatabase<Schema>({ path: fp, schema });
  }
}

export class MockAloeDatabase<Schema extends DatabaseDocument> extends BaseAloeDatabase<Schema> {
  protected constructor(schema: ZodSchema<Schema>) {
    super({ path: undefined, schema });
  }

  static async new<Schema extends DatabaseDocument>(
    { schema, documents = [] }: {
      schema: ZodSchema<Schema>;
      documents?: Array<Acceptable<Schema>>;
    },
  ): Promise<MockAloeDatabase<Schema>> {
    const db = new MockAloeDatabase<Schema>(schema);
    await db.insertMany(documents);
    return db;
  }
}
