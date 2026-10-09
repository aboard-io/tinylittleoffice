/** A small random generator, the same every run. */
export function rng(seed: number) {
  return () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff), seed / 0x7fffffff);
}
