/**
 * The kit's contract with an app: a definition (this file's AppDef) and an editor element, in
 * src/apps/<id>/. Everything the shell offers is driven by the definitions: the home page, the routes, the
 * templates, the downloads, the pictures. A definition touches no DOM, so the build and the tests read it
 * under node; the editor is a lazy import, which the site's build resolves inside its one app file (vite.config.ts)
 * and the API's leaves out (vite.api.config.ts).
 *
 * The document is the kernel's (docs/kernel.md), and passes through the kit as its TLO text: `Doc` here is that
 * string; the shell hands an editor the text and takes the text back, and an app parses it with src/doc.
 */
import type { IconNode } from 'lucide';
import type { Command } from './commands.ts';
import type { TextNode } from '../../doc/index.ts';

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
  /** Drawn inside another document, or as a thumbnail: the gist rather than the whole thing. A view that places another document passes it, with its own `still`. */
  small?: boolean;
  /**
   * Drawn where nothing can move: print, a PDF, a PNG, a thumbnail. Absent, the page may move (an animation
   * plays), as it does in a browser: the editor, the Display Link, an embed, a slideshow, a web page. A view
   * that places another document passes its own `still` through. Read it with isStill(), which counts `thumb`.
   */
  still?: boolean;
  /**
   * Drawn as a thumbnail (the home page's templates, a kept document's preview), with `small`: a wide document
   * on a landscape page holding what can be read at that size, not the whole thing shrunk. Never passed on a
   * slide, a site, a print or a file, so none of them changes with it. A thumbnail is `still` too.
   */
  thumb?: boolean;
  /** Presented a step at a time (a slide that holds this document): draw only the first `upTo` of its `steps`, the rest keeping their places. */
  upTo?: number;
  /** Drawn still at this frame of its motion (a film's frame of a slide that holds an animation, deck/view.ts deckFrames), with `still`; a document that does not move ignores it. */
  frame?: number;
  /** Drawn in an editor: a document locked with a password and opened this visit is drawn open (kit/share/locked.ts); a page, a print or a file never passes it. */
  open?: boolean;
  /**
   * Drawn as the picture a shared link previews with (kit/share/card.ts), with `still`: the one page that says
   * the most about the document, where that is not its first (a sheet's chart over its table: Paul, 2026-10-13,
   * "Put charts on the card"). Only the card passes it; the first page of view() stays what a print begins with.
   */
  card?: boolean;
}

/** Whether a page is drawn where nothing can move: `still`, or a thumbnail (which always is). */
export const isStill = (opts?: ViewOpts): boolean => !!(opts?.still || opts?.thumb);

/** A way to start: Blank first on the home page (unless the app's `blankInTemplates`), then these, each drawn small from its own document. */
export interface Template {
  id: string;
  name: string;
  blurb: string;
  doc: Doc;
}

/** What a format needs to build a file without the shell: the app (its `view`, its `title`, its `noun`), the document's name, its link. */
export interface ExportContext {
  def: AppDef;
  /** The document's name, for the file's ('' where it has none: a format names it from the document or the app). */
  title: string;
  /** The link to the document, so a file can point home. */
  link: string;
}

/**
 * A file a document can become, saying everything about itself: its extension and type, its words in the Download
 * table, whether the browser shows it, whether it is drawn still, and how it is built. The kit's six (PDF, PNG,
 * HTML, Markdown, TLO, JSON, in kit/file/exports.ts) and an app's own are the same shape; an app's own with a kit format's
 * `ext` is used in its place (kit/file/exports.ts formatsOf, the one list everything reads).
 */
export interface Export {
  ext: string;
  mime: string;
  label: () => string;
  /** How a browser shows the file: as itself (a PDF, a picture, a web page), as plain text (Markdown, CSV), or not at all (a .docx): the Download table's View. */
  shows: 'own' | 'text' | null;
  /** Drawn where nothing can move (ViewOpts.still): a PDF, a PNG. */
  still?: boolean;
  /**
   * Whether this browser can make the file (a video needs its encoder): asked once a session (kit/file/exports.ts
   * formatsReady), and a format that says no is not listed. Absent: always.
   */
  available?: () => Promise<boolean>;
  /** The file's bytes or text, built from the document alone; a promise where drawing in the browser is needed (a picture). */
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
 * the new text in `detail` on every edit (and before it "docops", the edit's operations, for a page that shares
 * the document: kit/core/element.ts). The shell writes it into the link. Undo and redo are the
 * kernel's (docs/kernel.md §6): the shell only forwards Mod+Z and Mod+Shift+Z as "docundo"/"docredo"
 * events on this element. Once a document is first drawn (not in display mode, not locked) the shell calls
 * `focusFirst()`: the focus goes where a person starts (docs/editing.md §1), without scrolling the page.
 */
export interface Editor extends HTMLElement {
  value: Doc;
  /** Shown and not edited: the `readonly` attribute (kit/core/element.ts). */
  readOnly: boolean;
  focusFirst?(): void | Promise<void>;
}
export type DocChange = CustomEvent<Doc>;

export interface AppDef {
  /** Route name and folder: "text". */
  id: string;
  /** Through t(): a getter, so the name follows the language. */
  readonly name: string;
  /** Through t(), lower case: what one document of the app is called ("presentation"), for "Untitled presentation", "New presentation" and a file's name. */
  readonly noun: string;
  /** The heading it is listed under on the home page. */
  readonly group: string;
  icon: IconNode;
  /** One line for the home page, link previews and search engines. */
  readonly blurb: string;
  /** A new document. */
  blank(): Doc;
  /**
   * The app's templates, when asked for: a file of their own in the build (`() => import('./templates.ts').then((m) => m.templates())`),
   * so the registry the home page imports carries none of their words. Blank needs none: it is `blank()`. Asked again
   * after a language is chosen, the names follow it.
   */
  templates(): Promise<Template[]>;
  /** The app's templates carry its blank pages (a Diagram Maker's blank per kind); the lists add no Blank of their own. Its row's name still opens `blank()`. */
  blankInTemplates?: boolean;
  /** The editor, lazily: the tag of its element (defined by the module). */
  editor(): Promise<{ tag: string }>;
  /** The document's own name, '' if it has none. (A head field; the kernel's `head` op will set it.) */
  title(doc: Doc): string;
  /** The document with this name. (Placeholder until the kernel: then one `head` op for every app.) */
  retitle(doc: Doc, title: string): Doc;
  /** The document, drawn: always at least one page. For the Display Link, an embed, print, PDF, PNG, previews and thumbnails (`still` where nothing can move). */
  view(doc: Doc, opts?: ViewOpts): Page[];
  exports?: Export[];
  handoffs?: Handoff[];
  /**
   * The app's commands (kit/core/commands.ts), lazily: its bar, its menus, its context bars and its keys are drawn and
   * answered from them, and the shortcuts dialog, the drawer's search (kit/ui/drawer.ts) and docs/editing.md's tables
   * list them. A module of its own beside the editor (commands.ts), which the editor imports too, so the home page
   * carries none of it.
   */
  commands?: () => Promise<{ default: readonly Command[] }>;
  /**
   * The document as what it says, for a screen reader, the Display Link's Text, a web page and the API
   * (src/doc/text.ts): given by an app whose model is spatial (a diagram's things and
   * connections); absent, the kernel's from the document's blocks (kit/text/text-layer.ts).
   */
  text?(doc: Doc): TextNode[];
  /** How many steps the document builds up in when presented (a list an item a step, a trip a stop a step); `view(doc, { upTo })` draws a part of it. Absent or 0: shown whole. */
  steps?(doc: Doc): number;
  /** The frames the document moves through (the Animator): their numbers in the order one round plays, and how long each stays, so a film of a slide holding it plays it (`view(doc, { still, frame })` draws one). Absent: it does not move. */
  motion?(doc: Doc): { frames: number[]; delayMs: number };
  /** Its page is words that may run longer than a slide can show (the Word Processor's): on a slide it is cut at the foot with "See more" rather than shrunk past reading. Absent, the document is a picture, drawn whole however small (a code, a map, a diagram, a month). */
  long?: boolean;
}

/**
 * The registry's lookup, reached from a definition that draws other apps' documents (a text holding a
 * sheet): set by src/kit/core/apps.ts once every definition is loaded, so no definition imports the registry.
 */
export const lookup: { appOf: (id: string) => AppDef | undefined } = { appOf: () => undefined };

/** Type an app's definition; nothing else happens here (the registry is src/kit/core/apps.ts). */
export const defineApp = (def: AppDef): AppDef => def;
