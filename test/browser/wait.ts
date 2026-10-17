// A wait for something to be so, for any browser test: the shell's (helpers.ts) and a bare page's (editors.test.ts) alike.
export const tick = (ms = 0) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Until `test()` holds, or a while has passed: a wait is a condition, never a time (test/lints.test.ts holds the tests
 * to it). `what` says what never came, for the failure: `until(() => ready(), 'the list never opened')`.
 */
export async function until(test: () => boolean, ms: number | string = 3000, what = 'never happened'): Promise<void> {
  const [limit, said] = typeof ms === 'string' ? [3000, ms] : [ms, what];
  const end = Date.now() + limit;
  while (!test()) {
    if (Date.now() > end) throw new Error(said);
    await tick(20);
  }
}

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
/**
 * The page at rest, for a test about to measure it: the fonts in, every transition and animation that ends ended, and
 * a frame drawn after them. What a fixed pause before a measurement hoped for, said as the thing itself: under load a
 * pause is too short, and at rest it is time wasted.
 */
export async function settled(): Promise<void> {
  await document.fonts.ready;
  for (let i = 0; i < 50; i++) {
    const moving = document.getAnimations().filter((a) => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity));
    if (!moving.length) break;
    await Promise.all(moving.map((a) => a.finished.catch(() => undefined)));
  }
  await frame();
  await frame();
}
