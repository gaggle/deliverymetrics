import { Dirpath, Epoch, Filepath } from "../types.ts";
import { fs, path } from "../deps.ts";
import { githubDiskCacheInfoSchema, GithubPull, githubPullSchema } from "./types.ts";
import { ensureJson, readJsonFile } from "../path-and-file-utils.ts";

export class GithubDiskCache {
  readonly paths: Readonly<{
    info: Filepath
    pulls: Dirpath
    root: Dirpath
  }>;

  private constructor(paths: {
    info: Filepath
    pulls: Dirpath
    root: Dirpath
  }) {
    this.paths = paths;
  }

  static async init(dirpath: string): Promise<GithubDiskCache> {
    const root = path.resolve(dirpath);
    await fs.ensureDir(root);

    const info = path.join(root, "info.json");
    await ensureJson(info, { schema: githubDiskCacheInfoSchema, defaults: { updatedAt: undefined } });

    const pulls = path.join(root, "pulls");
    await fs.ensureDir(pulls);

    return new GithubDiskCache({
      info,
      pulls,
      root,
    });
  }

  async getUpdatedAt(): Promise<Epoch | undefined> {
    return (await readJsonFile(this.paths.info, githubDiskCacheInfoSchema)).updatedAt;
  }

  async putUpdatedAt(time: Epoch): Promise<void> {
    const info = githubDiskCacheInfoSchema.parse(JSON.parse(await Deno.readTextFile(this.paths.info)));
    info.updatedAt = time;
    await Deno.writeTextFile(this.paths.info, JSON.stringify(info, null, 2));
  }

  async * getPulls(): AsyncGenerator<GithubPull> {
    for await (const entry of fs.walk(this.paths.pulls, { includeDirs: false })) {
      yield readJsonFile(entry.path, githubPullSchema);
    }
  }

  async putPulls(pulls: Array<GithubPull>, { syncTime }: { syncTime?: Epoch } = {}): Promise<void> {
    await Promise.all([
      syncTime ? await this.putUpdatedAt(syncTime) : undefined,
      // ↑ Update sync time...
      ...pulls.map(pull => this.putPull(pull))
      // ↑ ...and save all specified pulls (w/o passing sync time!)
    ]);
  }

  async putPull(pull: GithubPull, { syncTime }: { syncTime?: Epoch } = {}): Promise<void> {
    const fp = this.pullToFilename(pull);
    await Promise.all([
      syncTime ? await this.putUpdatedAt(syncTime) : undefined,
      // ↑ Update sync time...
      await Deno.writeTextFile(fp, JSON.stringify(pull, null, 2))
      // ↑ ...and save the specified pull
    ]);
  }

  private pullToFilename(pull: GithubPull): Filepath {
    return `${path.join(this.paths.pulls, pull.number.toString())}.json`;
  }
}

export class GithubMemoryCache {
  protected readonly data: {
    pulls: Record<number, GithubPull>;
    updatedAt?: number;
  } = {
    pulls: []
  };

  getUpdatedAt(): Promise<Epoch | undefined> {
    return Promise.resolve(this.data.updatedAt);
  }

  putUpdatedAt(time: Epoch): Promise<void> {
    this.data.updatedAt = time;
    return Promise.resolve();
  }

  async * getPulls(): AsyncGenerator<GithubPull> {
    for (const pull of Object.values(this.data.pulls)) {
      yield pull;
    }
  }

  async putPulls(pulls: Array<GithubPull>, { syncTime }: { syncTime?: Epoch } = {}): Promise<void> {
    await Promise.all([
      syncTime ? this.putUpdatedAt(syncTime) : undefined,
      ...pulls.map(pull => this.putPull(pull))
    ]);
  }

  async putPull(pull: GithubPull, { syncTime }: { syncTime?: Epoch } = {}): Promise<void> {
    await Promise.all([
      syncTime ? await this.putUpdatedAt(syncTime) : undefined,
      this.data.pulls[pull.number] = pull
    ]);
  }
}

export class GithubMockCache extends GithubMemoryCache {
  constructor({ pulls, updatedAt }: { pulls?: Array<GithubPull>, updatedAt?: Epoch } = {}) {
    super();
    this.data.updatedAt = updatedAt;
    for (const pull of pulls || []) {
      this.data.pulls[pull.number] = pull;
    }
  }
}
