/**
 * The editor's half of editing, in the page in its frame: one script (scripts/site-frame.ts builds it; view.ts
 * names it when the page is drawn for the editor, never in a page that is downloaded). Every thing on the page is
 * marked with its id (data-o), every run of its words with its part (data-w: "3:0", a paragraph's; "2.1:label", a
 * button's; "5:head", a big link's), and the words themselves are beside them as data ("site-edit"), as the kernel
 * holds them.
 *
 * A tap on a thing takes it in hand (outlined; the editor is told which and where, and as the page scrolls). A tap
 * on its words puts the kit's <to-text> there, in the thing itself, focused in the tap (so a phone's keyboard comes
 * up), the caret where the finger was: a one-line box, rich where the thing is (a paragraph: marks and links,
 * Shift+Enter a line break; a big link's words and the line under them: marks alone) and plain words, with no
 * bubble, where it is drawn plain (a heading, a button, a small link). Each change goes to the editor as the
 * thing's words now, which it writes as one `text` op. Enter in a heading or a paragraph keeps the words before the
 * caret and goes on into a new paragraph with the rest (the editor is told, and the page's ids move on by one as
 * the document's do); elsewhere Enter is done. Escape puts back the words as they were and is done; a tap
 * elsewhere keeps them (on another thing's words, those are typed next, in the same tap). Done, the editor draws
 * the page again.
 *
 * As before: a tap on the page's empty room lets the thing go; nothing in the page is followed or bought
 * meanwhile, but the nav still goes from page to page; the editor says which thing is in hand by a message (and
 * may ask for its words to be opened: Enter, Edit, a thing just put in); the undo and redo keys go to the editor,
 * and Select All never selects the page. Each thing (and the page) listens for its own click, for WebKit counts
 * a finger's tap as a click only on an element that does. The page keeps its place when drawn again. The editor
 * checks that a message comes from its own frame, and this script that one comes from its parent.
 */
import { applyAll, sliceRuns, type Block, type Run } from '../../doc/index.ts';
import { register, setLanguage, t } from '../../kit/i18n.ts';
import { blockLength, caret, insertRuns, ordered } from '../../kit/textops.ts';
import type { TextOps, ToText } from '../../kit/text.ts';
import type { PartName, WordsPart } from './model.ts';
import '../../kit/text.ts';
import css from './frame.css?inline';

interface Data {
  stamp: number;
  held: string | null;
  y: number;
  show: boolean;
  dark: boolean;
  words: Record<string, WordsPart>;
  strings: Record<string, string>;
}
/** Words open in the page: the thing, which of its words, where they are drawn, and how they were when opened. */
interface Open {
  id: string;
  part: PartName;
  el: HTMLElement;
  saved: Node[];
  first: Run[];
}

const D = JSON.parse(document.getElementById('site-edit')!.textContent!) as Data;
const lang = document.documentElement.lang || 'en';
register(lang, D.strings);
void setLanguage(lang);
if (D.dark) document.documentElement.dataset.theme = 'dark';
const sheet = document.createElement('style');
sheet.textContent = css;
document.head.append(sheet);

let held = D.held;
let soon = 0;
let open: Open | null = null;
const words = D.words;

/** The one words editor, drawn once and moved to the words tapped, so it can take the focus in the tap itself. */
const editor = document.createElement('to-text') as ToText;
editor.shape = 'line';
editor.hidden = true;
document.body.append(editor);

const send = (m: Record<string, unknown>) => parent.postMessage({ ...m, site: D.stamp }, '*');
const el = (id: string | null) => (id === null ? null : document.querySelector<HTMLElement>(`[data-o="${id}"]`));
const partEl = (id: string, part: string) => document.querySelector<HTMLElement>(`[data-w="${id}:${part}"]`);
function rect(id: string | null): number[] | null {
  const e = el(id);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return [r.left, r.top, r.width, r.height];
}
function mark(id: string | null) {
  document.querySelectorAll('.site-cur').forEach((e) => e.classList.remove('site-cur'));
  el(id)?.classList.add('site-cur');
}
function where() {
  soon = 0;
  send({ do: 'at', o: held, r: rect(held), y: window.scrollY });
}
const later = () => {
  if (!soon) soon = requestAnimationFrame(where);
};
const key = (id: string, part: string) => `${id}:${part}`;

/* ---------- words drawn, as the page draws them ---------- */

/** Runs as the page has them: marks, links, line breaks (an icon or a note is left to the page, drawn again when done). */
function drawRuns(runs: Run[]): Node[] {
  return runs.flatMap((r): Node[] => {
    if (r.ic || r.fn !== undefined) return [];
    let nodes: Node[] = r.t.split('\n').flatMap((s, i) => [...(i ? [document.createElement('br')] : []), ...(s ? [document.createTextNode(s)] : [])]);
    const wrap = (tag: string) => {
      const e = document.createElement(tag);
      e.append(...nodes);
      nodes = [e];
    };
    if (r.h) wrap('mark');
    if (r.s) wrap('s');
    if (r.u) wrap('u');
    if (r.i) wrap('em');
    if (r.b) wrap('strong');
    if (r.href) {
      wrap('a');
      (nodes[0] as HTMLAnchorElement).setAttribute('href', r.href);
    }
    return nodes;
  });
}
/** Where a finger fell in a run of words, as a character offset (a line break and an icon one each). */
function offsetAt(host: HTMLElement, x: number, y: number): number | null {
  const d = document as Document & { caretPositionFromPoint?(x: number, y: number): { offsetNode: Node; offset: number } | null };
  const p = d.caretPositionFromPoint?.(x, y);
  const r = p ? null : document.caretRangeFromPoint?.(x, y);
  const node = p?.offsetNode ?? r?.startContainer;
  const at = p?.offset ?? r?.startOffset ?? 0;
  if (!node || !host.contains(node)) return null;
  let n = 0;
  let found: number | null = null;
  const walk = (x: Node): boolean => {
    if (x === node && x.nodeType === Node.TEXT_NODE) return (found = n + at), true;
    if (x === node) {
      for (let i = 0; i < at && i < x.childNodes.length; i++) walk(x.childNodes[i]);
      return (found = n), true;
    }
    if (x.nodeType === Node.TEXT_NODE) n += (x as Text).length;
    else if (x instanceof Element && (x.tagName === 'BR' || x.tagName.toLowerCase() === 'svg')) n += 1;
    else for (const c of x.childNodes) if (walk(c)) return true;
    return false;
  };
  walk(host);
  return found;
}

/* ---------- the words editor ---------- */

/** A thing's words opened where they are drawn: the editor in their place, focused now, the caret at `at` (the end by default; 'all' chooses them). */
function openWords(id: string, part: PartName, at: number | 'all' | null = null): boolean {
  const w = words[key(id, part)];
  const host = partEl(id, part);
  if (!w || !host) return false;
  if (open) close(false);
  open = { id, part, el: host, saved: [...host.childNodes], first: w.runs };
  editor.noBubble = w.kind === 'plain';
  editor.marksOnly = w.kind === 'marks';
  editor.label = w.label;
  editor.placeholder = w.placeholder;
  editor.blocks = [{ k: 'p', runs: w.runs }];
  host.replaceChildren(editor);
  editor.hidden = false;
  // Focused now, in the tap: the words come a moment later, and the caret with them.
  editor.focus();
  void editor.updateComplete.then(() => {
    if (open?.el !== host) return;
    const len = blockLength(editor.model[0]);
    editor.sel = at === 'all' ? { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: len } } : caret(0, at === null ? len : Math.min(at, len));
    later();
  });
  return true;
}
/** The words let go of: drawn as they are now (or put back as they were, `back`), the editor put away. */
function close(back: boolean) {
  const o = open;
  if (!o) return;
  open = null;
  const w = words[key(o.id, o.part)];
  if (back) {
    if (w) w.runs = o.first;
    o.el.replaceChildren(...o.saved);
  } else o.el.replaceChildren(...drawRuns(w?.runs ?? []));
  editor.hidden = true;
  document.body.append(editor);
}
/** Done with the words: the editor draws the page again. */
function done(back = false) {
  const o = open;
  if (!o) return;
  close(back);
  send({ do: 'end', o: o.id });
}
/** The words as the kind of thing keeps them: plain words have no marks; nothing is a note. */
function kept(runs: Run[], w: WordsPart): Run[] {
  const words = runs.filter((r) => r.fn === undefined && (w.kind !== 'plain' || !r.ic));
  if (w.kind === 'plain') return words.map((r) => ({ t: r.t.replace(/\n/g, ' ') })).filter((r) => r.t);
  return w.kind === 'marks' ? words.map(({ href: _h, ...r }) => r) : words;
}
/** The words changed: kept here, drawn in the editor, told to the editor. */
function put(runs: Run[]) {
  const o = open;
  if (!o) return;
  const w = words[key(o.id, o.part)];
  w.runs = runs;
  editor.blocks = [{ k: 'p', runs }];
  send({ do: 'words', o: o.id, part: o.part, runs });
  // The site's name where there was none: a heading is put in at the top, and every thing after it is one block on.
  if (o.id === '-1' && runs.length) {
    renumber(0, 1);
    rename('-1', '0');
  }
  later();
}
editor.addEventListener('text-ops', (e) => {
  const o = open;
  if (!o) return;
  const w = words[key(o.id, o.part)];
  const next = applyAll({ head: {}, blocks: editor.blocks }, (e as CustomEvent<TextOps>).detail.ops).blocks[0] as Block | undefined;
  put(kept(next && 'runs' in next ? next.runs : [], w));
});
editor.addEventListener('text-enter', (e) => {
  const o = open;
  if (!o) return;
  const w = words[key(o.id, o.part)];
  // (The selection as the page has it now: a key just pressed may have moved it before the editor heard.)
  const sel = editor.readSel() ?? editor.sel ?? caret(0, blockLength(editor.model[0]));
  if ((e as CustomEvent<{ shift: boolean }>).detail.shift && w.breaks) {
    const r = insertRuns(editor.blocks.length ? editor.blocks : [{ k: 'p', runs: [] }], sel, [{ t: '\n' }]);
    const b = applyAll({ head: {}, blocks: editor.blocks.length ? editor.blocks : [{ k: 'p', runs: [] }] }, r.ops).blocks[0];
    put(b && 'runs' in b ? b.runs : []);
    editor.sel = r.sel;
    return;
  }
  if (!w.next || o.id === '-1') return done();
  split(o, w, sel.anchor.offset === sel.focus.offset ? sel.anchor.offset : ordered(sel)[0].offset, ordered(sel)[1].offset);
});
editor.addEventListener('text-escape', (e) => {
  if (!open) return;
  e.preventDefault();
  const o = open;
  const changed = JSON.stringify(words[key(o.id, o.part)]?.runs) !== JSON.stringify(o.first);
  if (changed) send({ do: 'words', o: o.id, part: o.part, runs: o.first });
  done(true);
});
for (const type of ['text-exit', 'text-select', 'text-selectall']) editor.addEventListener(type, (e) => e.stopPropagation());

/** Every id of a block from `from` on moved by `by` (the document's blocks moved by a paragraph put in). */
function renumber(from: number, by: number) {
  const move = (id: string) => id.replace(/^(-?\d+)/, (n) => (Number(n) >= from ? String(Number(n) + by) : n));
  for (const attr of ['data-o', 'data-sec', 'data-w'])
    document.querySelectorAll<HTMLElement>(`[${attr}]`).forEach((e) => e.setAttribute(attr, move(e.getAttribute(attr)!)));
  for (const k of Object.keys(words).sort((a, b) => (by > 0 ? parseFloat(b) - parseFloat(a) : parseFloat(a) - parseFloat(b)))) {
    const to = move(k);
    if (to === k) continue;
    words[to] = words[k];
    delete words[k];
  }
  if (held !== null) held = move(held);
  if (open) open.id = move(open.id);
}
function rename(from: string, to: string) {
  for (const attr of ['data-o', 'data-sec', 'data-w'])
    document.querySelectorAll<HTMLElement>(`[${attr}]`).forEach((e) => {
      const v = e.getAttribute(attr)!;
      if (v === from || v.startsWith(`${from}:`)) e.setAttribute(attr, to + v.slice(from.length));
    });
  for (const k of Object.keys(words))
    if (k.startsWith(`${from}:`)) {
      words[to + k.slice(from.length)] = words[k];
      delete words[k];
    }
  if (held === from) held = to;
  if (open?.id === from) open.id = to;
}
/** Enter in a heading or a paragraph: it keeps the words before the caret, a new paragraph after it the rest, typed on at its start. */
function split(o: Open, w: WordsPart, from: number, to: number) {
  const runs = w.runs;
  const before = sliceRuns(runs, 0, from);
  const after = sliceRuns(runs, to, blockLength({ k: 'p', runs }));
  const at = Number(o.id);
  send({ do: 'split', o: o.id, before, after });
  w.runs = before;
  close(false);
  renumber(at + 1, 1);
  const id = String(at + 1);
  const p = document.createElement('p');
  p.setAttribute('data-o', id);
  p.setAttribute('data-w', `${id}:0`);
  p.setAttribute('data-empty', t('Words for the page'));
  p.addEventListener('click', () => {});
  el(String(at))?.after(p);
  words[key(id, '0')] = { runs: after, kind: 'rich', next: true, breaks: true, label: t('Paragraph'), placeholder: t('Words for the page') };
  held = id;
  mark(id);
  openWords(id, '0', 0);
}

/* ---------- taps, the editor's words, the keys ---------- */

document.addEventListener(
  'click',
  (ev) => {
    const tgt = ev.target as Element | null;
    if (!tgt?.closest) return;
    // The words being typed, and their bubble and link box, are the editor's own; a link in them is not followed.
    if (editor.contains(tgt)) {
      if (tgt.closest('a[href]')) ev.preventDefault();
      return;
    }
    const o = tgt.closest<HTMLElement>('[data-o]');
    if (!o) {
      const a = tgt.closest('a[href]');
      if (a) {
        if (a.getAttribute('href')!.charAt(0) !== '#') ev.preventDefault();
        return;
      }
      // (Said before the words are done: done, the page is drawn again, and what it says after is from a page gone.)
      if (held !== null) {
        held = null;
        mark(null);
        send({ do: 'pick', o: null });
      }
      done();
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    const id = o.getAttribute('data-o')!;
    // The words under the finger, or the thing's first.
    const hit = tgt.closest<HTMLElement>('[data-w]');
    const wEl = hit && o.contains(hit) ? hit : (o.matches('[data-w]') ? o : o.querySelector<HTMLElement>('[data-w]'));
    const part = wEl ? (wEl.getAttribute('data-w')!.split(':')[1] as PartName) : null;
    const at = wEl ? offsetAt(wEl, (ev as MouseEvent).clientX, (ev as MouseEvent).clientY) : null;
    held = id;
    mark(id);
    if (part && words[key(id, part)]) {
      openWords(id, part, at);
      send({ do: 'pick', o: id, r: rect(id), y: window.scrollY, words: true });
    } else {
      send({ do: 'pick', o: id, r: rect(id), y: window.scrollY });
      done();
    }
  },
  true,
);
window.addEventListener('message', (ev) => {
  const m = ev.data as { site?: number; held?: string | null; show?: boolean; edit?: string; all?: boolean } | null;
  if (ev.source !== parent || !m || m.site !== D.stamp) return;
  if (typeof m.edit === 'string') {
    const id = m.edit;
    const first = el(id)?.matches('[data-w]') ? el(id) : el(id)?.querySelector('[data-w]');
    held = id;
    mark(id);
    if (first) openWords(id, first.getAttribute('data-w')!.split(':')[1] as PartName, m.all ? 'all' : null);
    where();
    return;
  }
  held = m.held === undefined ? null : m.held;
  if (open && open.id !== held) close(false);
  mark(held);
  const e = el(held);
  if (e && m.show) e.scrollIntoView({ block: 'nearest' });
  where();
});
document.addEventListener('keydown', (ev) => {
  const k = ev.key.toLowerCase();
  const mod = ev.ctrlKey || ev.metaKey;
  if (mod && (k === 'z' || k === 'y')) {
    ev.preventDefault();
    send({ do: k === 'y' || ev.shiftKey ? 'redo' : 'undo' });
    return;
  }
  const tgt = ev.target as HTMLElement;
  if (mod && k === 'a' && !editor.contains(tgt) && !/^(INPUT|TEXTAREA|SELECT)$/.test(tgt.tagName)) ev.preventDefault();
});
window.addEventListener('scroll', later, { passive: true });
window.addEventListener('resize', later);
document.querySelectorAll('html,body,[data-o],[data-sec]').forEach((e) => e.addEventListener('click', () => {}));
window.addEventListener('hashchange', () => send({ do: 'page', id: decodeURIComponent(location.hash.slice(1)) }));
if (D.y) window.scrollTo(0, D.y);
mark(held);
const e0 = el(held);
if (e0 && D.show) e0.scrollIntoView({ block: 'nearest' });
send({ do: 'ready' });
where();
