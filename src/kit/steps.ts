/**
 * A document presented a step at a time (AppDef.steps; a slide that holds it builds on each click): the
 * page the whole document makes, drawn with only the part shown so far, so nothing moves as it builds. An
 * app whose drawing places things from the top (a list) draws the part of its document and takes the
 * whole's size here; one that fits its drawing to everything (a map) draws `upTo` itself.
 */
import type { Page } from './app.ts';

export const partOf = (whole: Page, part: Page): Page => ({ ...whole, svg: part.svg });
