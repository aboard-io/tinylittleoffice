/**
 * A document's text layer as its app gives it (src/doc/text.ts): the app's own where its model is spatial
 * (AppDef.text), else the kernel's from its blocks; a document fenced inside it read by its own app the same way.
 * No DOM: the API and the command line read it too (src/api.ts `text`); kit/text-view.ts draws it.
 */
import { parse, textOf, type TextNode } from '../doc/index.ts';
import { lookup, type AppDef, type Doc } from './app.ts';

export function textLayer(def: AppDef, doc: Doc): TextNode[] {
  if (def.text) return def.text(doc);
  return textOf(parse(doc), {
    inner: (lang, body) => {
      const inner = lookup.appOf(lang);
      return inner ? { k: 'doc', app: inner.name, title: inner.title(body), nodes: textLayer(inner, body) } : undefined;
    },
  });
}
