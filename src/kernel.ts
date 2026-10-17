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
 */
export * from './doc/index.ts';
export { docJson, jsonDoc } from './doc/json.ts';
