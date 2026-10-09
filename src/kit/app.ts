/**
 * The kit's contract with an app: a definition (this file's AppDef) and an editor element, in
 * src/apps/<id>/. Everything the shell offers is driven by the definitions: the home page, the routes, the
 * templates, the downloads, the pictures. A definition touches no DOM, so the build and the tests read it
 * under node; the editor is a lazy import, a chunk of its own, fetched when the app opens.
 *
 * The document is the kernel's (docs/kernel.md). Until src/doc lands it passes through the kit as its TLO
 * text, and `Doc` here is that string: the shell hands an editor the text and takes the text back.
 */
import type { IconNode } from 'lucide';

/** A document: its TLO text. (The kernel's parse/write will sit at either end of this string.) */
export type Doc = string;

/** One page of a document, drawn. `svg` is what goes inside the <svg> element (viewBox 0 0 w h). */
export interface Page {
  w: number;
  h: number;
  svg: string;
  /** What the page shows, in words, for anyone who cannot see it. */
  alt?: string;
}

export interface ViewOpts {
  /** Drawn inside another document, or as a thumbnail: the gist rather than the whole thing. */
  small?: boolean;
}

/** A way to start: Blank first on the home page, then these, each drawn small from its own document. */
export interface Template {
  id: string;
  name: string;
  blurb: string;
  doc: Doc;
}

export interface ExportContext {
  /** The document's name, for the file's. */
  title: string;
  /** The link to the document, so a file can point home. */
  link: string;
}

/** A file an app can become, beyond what the kit gives every app (PDF, picture, web page, text). */
export interface Export {
  ext: string;
  label: () => string;
  mime: string;
  /** The file's bytes or text; a promise where drawing in the browser is needed (a picture). */
  build(doc: Doc, ctx: ExportContext): Uint8Array | string | Promise<Uint8Array | string>;
}

/**
 * A hand-off to another app: this document opened there, converted if need be ("Animate this drawing" from
 * Draw to Motion). Listed under Download only once the other app is in the registry, so an app may offer
 * one before its partner has been built.
 */
export interface Handoff {
  /** The other app's id. */
  to: string;
  label: () => string;
  /** This document as the other app reads it (often itself). */
  convert(doc: Doc): Doc;
}

/**
 * The editor element an app's `editor()` names: given the document as `value`, it fires "docchange" with
 * the new text in `detail` on every edit. The shell writes it into the link. Undo and redo are the
 * kernel's (docs/kernel.md §8): the shell only forwards Mod+Z and Mod+Shift+Z as "docundo"/"docredo"
 * events on this element.
 */
export interface Editor extends HTMLElement {
  value: Doc;
}
export type DocChange = CustomEvent<Doc>;

export interface AppDef {
  /** Route name and folder: "text". */
  id: string;
  /** Through t(): a getter, so the name follows the language. */
  readonly name: string;
  /** The heading it is listed under on the home page. */
  readonly group: string;
  icon: IconNode;
  /** One line for the home page, link previews and search engines. */
  readonly blurb: string;
  /** A new document. */
  blank(): Doc;
  readonly templates: Template[];
  /** The editor, lazily: the tag of its element (defined by the module). */
  editor(): Promise<{ tag: string }>;
  /** The document's own name, '' if it has none. (A head field; the kernel's `head` op will set it.) */
  title(doc: Doc): string;
  /** The document with this name. (Placeholder until the kernel: then one `head` op for every app.) */
  retitle(doc: Doc, title: string): Doc;
  /** The document, drawn: always at least one page. For print, PDF, PNG, previews and thumbnails. */
  view(doc: Doc, opts?: ViewOpts): Page[];
  exports?: Export[];
  handoffs?: Handoff[];
}

/** Type an app's definition; nothing else happens here (the registry is src/kit/apps.ts). */
export const defineApp = (def: AppDef): AppDef => def;
