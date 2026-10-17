/**
 * The document kernel for a program that holds documents of its own (docs/library.md): the model, TLO in and out, the
 * operations, their inverses and their transformation for shared editing, tables and the formula engine, and the
 * document as JSON. Nothing here touches the DOM: it runs in Node, Deno, Bun, a Worker or a page as it is. The npm
 * package serves it as `tinylittleoffice/doc`; the site's /api.js (src/api.ts) is the link-making layer over the same
 * kernel.
 *
 *   import { parse, write, apply, applyAll, invert, rebase } from 'tinylittleoffice/doc';
 *   const doc = parse(text);
 *   const next = apply(doc, op);           // one operation
 *   applyAll(next, invert(doc, op));       // invert gives the ops that put it back; applyAll applies them, an undo
 *   rebase(mine, theirs);                  // shared editing: my pending ops over the server's (transform, applyEdits)
 *   write(next);                           // canonical TLO text
 *   docJson(next); jsonDoc(json);          // the document as JSON, to packages/doc/schema/tlo.schema.json, and back
 *
 * And who did what in a document several people write, for a server as for a page (docs/library.md, Tracked changes
 * and comments for a host): `track` and `trackOn` (its versions by their authors to tracked blocks), `changesOf`
 * (each person's changes), `rejectOps` (the edit that takes changes back), `diffLines` and the helpers that put a
 * block back as it was. They are the kit's modules (kit/text/changes.ts, reject.ts, diff.ts), which are pure, and
 * `tinylittleoffice/kit` serves the same functions to a page; here a program has them with no Lit. The kit's `textOf`,
 * a block's words as the editor counts them, is the kit's alone: the kernel's `textOf` is its text layer.
 */
export * from './doc/index.ts';
export { docJson, jsonDoc } from './doc/json.ts';
export {
  blockFrom,
  changesOf,
  isHead,
  kindTo,
  lookOf,
  lookTo,
  marksOf,
  OTHER,
  restylings,
  runOf,
  track,
  trackOn,
  type Change,
  type Step,
  type Tok,
  type Tracked,
  type Under,
} from './kit/text/changes.ts';
export { rejectOps } from './kit/text/reject.ts';
export { diffLines } from './kit/text/diff.ts';
