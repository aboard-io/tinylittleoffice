/**
 * The calculator's second engine, for what the hand parser (model.ts) does
 * not read: units and conversions ("3 inch to cm", "60 mph in km/h",
 * "2 cups + 3 tbsp"), numbers past what a double holds, and a little
 * algebra (derivative, simplify). A custom mathjs with only what that
 * takes; mathjs compiles an expression to closures, never to code, so it
 * runs under a policy with no eval. Loaded only when the calculator opens
 * (a chunk of its own: editor.ts imports it).
 *
 * Native first: the browser has no expression reader but eval and the
 * Function constructor, which the page's policy forbids, and Intl formats
 * units without converting them; so mathjs, pinned, in this one chunk.
 */
import {
  absDependencies,
  acosDependencies,
  addDependencies,
  asinDependencies,
  atan2Dependencies,
  atanDependencies,
  cbrtDependencies,
  ceilDependencies,
  cosDependencies,
  coshDependencies,
  create,
  createUnitDependencies,
  derivativeDependencies,
  divideDependencies,
  eDependencies,
  evaluateDependencies,
  expDependencies,
  factorialDependencies,
  floorDependencies,
  formatDependencies,
  gcdDependencies,
  lcmDependencies,
  log10Dependencies,
  log2Dependencies,
  logDependencies,
  maxDependencies,
  minDependencies,
  modDependencies,
  multiplyDependencies,
  nthRootDependencies,
  numberDependencies,
  phiDependencies,
  piDependencies,
  powDependencies,
  roundDependencies,
  simplifyDependencies,
  sinDependencies,
  sinhDependencies,
  sqrtDependencies,
  subtractDependencies,
  tanDependencies,
  tanhDependencies,
  tauDependencies,
  toDependencies,
  unitDependencies,
} from 'mathjs';
import type { Engine } from './model.ts';

const math = create(
  {
    absDependencies,
    acosDependencies,
    addDependencies,
    asinDependencies,
    atan2Dependencies,
    atanDependencies,
    cbrtDependencies,
    ceilDependencies,
    cosDependencies,
    coshDependencies,
    createUnitDependencies,
    derivativeDependencies,
    divideDependencies,
    eDependencies,
    evaluateDependencies,
    expDependencies,
    factorialDependencies,
    floorDependencies,
    formatDependencies,
    gcdDependencies,
    lcmDependencies,
    log10Dependencies,
    log2Dependencies,
    logDependencies,
    maxDependencies,
    minDependencies,
    modDependencies,
    multiplyDependencies,
    nthRootDependencies,
    numberDependencies,
    phiDependencies,
    piDependencies,
    powDependencies,
    roundDependencies,
    simplifyDependencies,
    sinDependencies,
    sinhDependencies,
    sqrtDependencies,
    subtractDependencies,
    tanDependencies,
    tanhDependencies,
    tauDependencies,
    toDependencies,
    unitDependencies,
  },
  // Numbers as big as they are written: 171! is a number, not infinity; 0.1 + 0.2 is 0.3.
  { number: 'BigNumber', precision: 32 },
);
// Units people type that mathjs does not know by those names, and the logs as the keys name them (ln natural, log base ten).
math.createUnit({ mph: '1 mi/h', kph: '1 km/h', tbsp: '1 tablespoon', tsp: '1 teaspoon' });
math.import({ ln: math.log, log: math.log10 }, { override: true });

/** What a result reads as: a number as the calculator shows numbers, a quantity with its unit, an expression as algebra writes it. */
const textOf = (v: unknown): string => {
  if (v !== null && typeof v === 'object' && 'isNode' in v && v.isNode) return String(v);
  return math.format(v, { precision: 10, lowerExp: -7, upperExp: 12 }).replace(/^-/, '−');
};

/** A result is a plain number where it is one; a quantity or an expression is NaN to the lines that want a number, and itself to the scope. */
const numberOf = (v: unknown): number => (typeof v === 'number' || math.isBigNumber(v) ? math.number(v as number) : NaN);

export const engine: Engine = (src, scope) => {
  const value: unknown = math.evaluate(src, { π: math.pi, ...scope });
  return { value, text: textOf(value), number: numberOf(value) };
};
