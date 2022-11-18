import { aloe, fs, path, z } from "../deps.ts";
import type { Filepath } from "../types.ts";

type DatabaseDocument = aloe.Document & { _id?: never };

export class AloeDatabase<Schema extends DatabaseDocument> {
  private db: aloe.Database<aloe.Acceptable<Schema>>;

  private constructor(
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
