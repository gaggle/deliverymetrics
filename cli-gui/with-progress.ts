import { MultiProgressBar } from "progress";

import { throttle } from "../utils.ts";
import { WithOptional } from "../types.ts";
import { debug } from "std:log";

/**
 * progress doesn't expose its `renderOptions` type, so we have to dig around a bit to infer it
 */
type ProgressRenderOptions = Parameters<MultiProgressBar["render"]>[0][number];

type Progress = {
  increment: (name: string, opts?: Omit<ProgressRenderOptions, "completed">) => unknown;
  render: (name: string, opts?: WithOptional<ProgressRenderOptions, "completed">) => unknown;
};

export async function withProgress(
  callable: (progress: Progress) => Promise<unknown> | unknown,
  opts?: Partial<
    { title: string; display: string; width: number; bars: Record<string, Partial<ProgressRenderOptions>> }
  >,
) {
  /**
   * Initialize data structure mapping specific bars to their render options
   */
  const bars = opts?.bars || {};
  const barsData = Object.entries(bars).reduce((acc, [key, initialOptions]) => {
    const { completed, ...rest } = initialOptions;
    acc[key] = { ...rest, count: completed || 0 };
    return acc;
  }, {} as Record<string, { count: number } & Omit<ProgressRenderOptions, "completed">>);

  const barGroup = new MultiProgressBar({
    width: opts?.width,
    title: opts?.title || " ",
    display: opts?.display || "[:bar] :text :percent :time :completed/:total",
  });

  const render = throttle(() => {
    const bars: Array<ProgressRenderOptions> = Object.values(barsData).map((val) => {
      const { count, ...rest } = val;
      return { completed: count, ...rest };
    });
    debug(bars);
    barGroup.render(bars);
  }, 16);

  const progress: Progress = {
    increment: (name, opts): void => {
      const newBarData = { ...barsData[name] || { count: 0 }, ...opts };
      newBarData.count += 1;
      debug("inc", name, { oldBarData: barsData[name], newBarData });
      barsData[name] = newBarData;
      render();
    },
    render: (name, opts): void => {
      const { completed, ...rest }: ProgressRenderOptions = { completed: 0, ...opts };
      const newBarData = { ...barsData[name] || { count: completed }, ...rest };
      debug("rnd", name, { oldBarData: barsData[name], newBarData });
      barsData[name] = newBarData;
      render();
    },
  };

  render();

  try {
    await callable(progress);
    barGroup.end();
  } catch (err: unknown) {
    barGroup.end();
    throw err;
  }
}
