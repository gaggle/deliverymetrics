import { aloe, fs, path, z } from "../deps.ts";
import type { Filepath } from "../types.ts";

type DatabaseDocument = aloe.Document & { _id?: never };

class BaseAloeDatabase<Schema extends DatabaseDocument> {
  protected db: aloe.Database<aloe.Acceptable<Schema>>;

  protected constructor(
    { path: fp, schema }: {
      path: Filepath | undefined;
      schema: z.Schema<Schema>;
    },
  ) {
    this.db = new aloe.Database<aloe.Acceptable<Schema>>({
      path: fp,
      validator: schema.parse,
    });
  }

  count(
    ...args: Parameters<aloe.Database<aloe.Acceptable<Schema>>["count"]>
  ): ReturnType<aloe.Database<aloe.Acceptable<Schema>>["count"]> {
    return this.db.count(...args);
  }

  findOne(
    ...args: Parameters<aloe.Database<aloe.Acceptable<Schema>>["findOne"]>
  ): ReturnType<aloe.Database<aloe.Acceptable<Schema>>["findOne"]> {
    return this.db.findOne(...args);
  }

  findMany(
    ...args: Parameters<aloe.Database<aloe.Acceptable<Schema>>["findMany"]>
  ): ReturnType<aloe.Database<aloe.Acceptable<Schema>>["findMany"]> {
    return this.db.findMany(...args);
  }

  insertOne(
    ...args: Parameters<aloe.Database<aloe.Acceptable<Schema>>["insertOne"]>
  ): ReturnType<aloe.Database<aloe.Acceptable<Schema>>["insertOne"]> {
    return this.db.insertOne(...args);
  }

  insertMany(
    ...args: Parameters<aloe.Database<aloe.Acceptable<Schema>>["insertMany"]>
  ): ReturnType<aloe.Database<aloe.Acceptable<Schema>>["insertMany"]> {
    return this.db.insertMany(...args);
  }

  updateOne(
    ...args: Parameters<aloe.Database<aloe.Acceptable<Schema>>["updateOne"]>
  ): ReturnType<aloe.Database<aloe.Acceptable<Schema>>["updateOne"]> {
    return this.db.updateOne(...args);
  }

  updateMany(
    ...args: Parameters<aloe.Database<aloe.Acceptable<Schema>>["updateMany"]>
  ): ReturnType<aloe.Database<aloe.Acceptable<Schema>>["updateMany"]> {
    return this.db.updateMany(...args);
  }
}

export class AloeDatabase<Schema extends DatabaseDocument> extends BaseAloeDatabase<Schema> {
  static async new<Schema extends DatabaseDocument>(
    { path: fp, schema }: {
      path: Filepath | undefined;
      schema: z.Schema<Schema>;
    },
  ): Promise<AloeDatabase<Schema>> {
    if (fp !== undefined) {
      await fs.ensureDir(path.dirname(fp));
    }
    return new AloeDatabase<Schema>({ path: fp, schema });
  }
}

export class MockAloeDatabase<Schema extends DatabaseDocument> extends BaseAloeDatabase<Schema> {
  protected constructor(schema: z.Schema<Schema>) {
    super({ path: undefined, schema });
  }

  static async new<Schema extends DatabaseDocument>(
    { schema, documents = [] }: { schema: z.Schema<Schema>, documents?: Array<aloe.Acceptable<Schema>> }
  ): Promise<MockAloeDatabase<Schema>> {
    const db = new MockAloeDatabase<Schema>(schema);
    await db.insertMany(documents);
    return db;
  }
}
