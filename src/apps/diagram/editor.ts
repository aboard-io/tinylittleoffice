/**
 * <to-diagram-editor>: the picture is the editor. Tap empty space and a new thing is typed there (in a lane,
 * or in the circles tapped); tap a thing and its words open over it in a one-line <to-text>, with the few
 * things to do to it underneath (one more like it, a picture, a connection, take it away); Enter starts the
 * next; drag a thing onto another to put it under or after it, into a lane or a set to move it there. The
 * kind is a menu in the one bar. Every change is the kernel's operations (model.ts): the line editor's own
 * `text` ops on the line, a `splice` when a thing comes or goes, a `move` when one moves; nothing else
 * touches the document.
 */
import { html, nothing, svg, type PropertyDeclarations } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { ArrowRight, CornerDownRight, Minus, Smile, Spline, ZoomIn, ZoomOut } from 'lucide';
import { applyAll, type Block, type Doc, type Op } from '../../doc/index.ts';
import { btn, tool } from '../../kit/bar.ts';
import { DocElement } from '../../kit/element.ts';
import { UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import { place, type MenuItem } from '../../kit/menu.ts';
import type { TextOps, ToText } from '../../kit/text.ts';
import { isLink } from '../draw/model.ts';
import { arrowDefs, shapeSvg, type Theme } from '../draw/view.ts';
import { KIND_ICON, kindHint, kindName, lineHint, thingName } from './kinds.ts';
import { KINDS, charsOf, childOf, commitDraft, connect, dropIn, dropOn, edgesOf, follow, isListed, isTree, joins, kindOf, lineOf, nextThing, newThing, partFor, removeThing, rename, setEdge, setKind, tidy, withIcon, type Draft, type Hit, type KindId } from './model.ts';
import { layout, regionAt, type DShape, type Diagram } from './view.ts';
import '../../kit/bar.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/text.ts';
import './style.css';

export const tag = 'to-diagram-editor';

/** The page's own colours, so a diagram looks right in the dark too. */
const THEME: Theme = { ink: 'var(--to-ink)', paper: 'var(--to-surface)', shade: 'var(--to-surface-2)' };

export interface DiagramView {
  kind: KindId;
  d: Diagram;
}

/**
 * What the line editor over the picture is editing: a line of the document (`at`), a thing not yet in it
 * (`draft`), or a name that is not one line's words (a lane, a thing only connections name, a connection's
 * words), held as a block of its own (`block`) whose words are written back wherever the name is.
 */
interface Target {
  hit: Hit | null;
  at: number;
  draft: Draft | null;
  block: Extract<Block, { k: 'li' }> | null;
  /** The name as it stands, for a name renamed wherever it is. */
  name: string;
}

type Drag = { i: number; hit: Hit; x: number; y: number; moved: boolean };

const shifted = (ops: Op[], by: number): Op[] => ops.map((o) => (o.op === 'head' ? o : o.op === 'move' ? { ...o, at: o.at + by, to: o.to + by } : { ...o, at: o.at + by }));
const li = (words: string): Extract<Block, { k: 'li' }> => ({ k: 'li', depth: 0, runs: words ? [{ t: words }] : [] });
const plain = (b: Block) => ('runs' in b ? charsOf(b.runs).replace(/￼/g, '').trim() : '');

export class ToDiagramEditor extends DocElement<DiagramView> {
  static properties: PropertyDeclarations = { target: { state: true }, joining: { state: true }, zoom: { state: true } };
  /** The thing open in the line editor, or null. */
  declare target: Target | null;
  /** Half a connection: the name of the thing it starts from; the next thing tapped is its other end. */
  declare joining: string | null;
  /** The picture's scale: 0 fits it to the width. */
  declare zoom: number;
  private drag: Drag | null = null;
  /** When a drag last ended, or the line editor last closed: the click that follows is not a tap. */
  private quietUntil = 0;
  private ones = new WeakMap<Block, Block[]>();

  constructor() {
    super();
    this.target = null;
    this.joining = null;
    this.zoom = 0;
  }

  protected read(doc: Doc): DiagramView {
    return { kind: kindOf(doc), d: layout(doc) };
  }
  protected undone() {
    this.shut(false);
  }
  private one(b: Block): Block[] {
    let a = this.ones.get(b);
    if (!a) this.ones.set(b, (a = [b]));
    return a;
  }

  /* ---------- the line editor over the picture ---------- */

  private get pop(): HTMLElement | null {
    return this.querySelector<HTMLElement>('.dg-pop');
  }
  private get line(): ToText | null {
    return this.querySelector<ToText>('.dg-pop to-text');
  }
  /** The block the line editor shows. */
  private shown(): Block | null {
    const tg = this.target;
    if (!tg) return null;
    if (tg.draft) return tg.draft.block;
    if (tg.at >= 0) return this.doc.blocks[tg.at]?.k === 'li' ? this.doc.blocks[tg.at] : null;
    return tg.block;
  }

  /** Open the line editor on a target, over `anchor`, the caret (or a selection) at [from, to). */
  private async open(tg: Target, anchor: Element, sel?: [number, number]) {
    this.target = tg;
    await this.updateComplete;
    const pop = this.pop;
    const x = this.line;
    if (!pop || !x) return;
    if (!pop.matches(':popover-open')) pop.showPopover();
    place(pop, anchor as HTMLElement, 6);
    await x.updateComplete;
    const b = this.shown();
    const end = b && 'runs' in b ? charsOf(b.runs).length : 0;
    const [from, to] = sel ?? [end, end];
    x.sel = { anchor: { block: 0, offset: from }, focus: { block: 0, offset: to } };
  }
  /** A thing of the picture, tapped: its words open over it. */
  private openHit(hit: Hit, anchor: Element) {
    if (hit.k === 'line') {
      const b = this.doc.blocks[hit.at];
      if (b?.k !== 'li') return;
      const p = partFor(lineOf(b, hit.at), hit.part);
      return void this.open({ hit, at: hit.at, draft: null, block: null, name: '' }, anchor, p ? [p.from, p.to] : undefined);
    }
    const name = hit.k === 'edge' ? (edgesOf(this.doc).find((e) => e.at === hit.at)?.label ?? '') : hit.name;
    const block = li(name);
    void this.open({ hit, at: -1, draft: null, block, name }, anchor, [0, charsOf(block.runs).length]);
  }
  /** A new thing, typed over `anchor`: it is in the document from its first letter. */
  private openDraft(d: Draft, anchor: Element) {
    void this.open({ hit: null, at: -1, draft: d, block: null, name: '' }, anchor, d.sel);
  }
  /** The line editor closed; a list it leaves is tidied. */
  private shut(tidyUp = true) {
    const tg = this.target;
    if (!tg) return;
    this.target = null;
    this.quietUntil = performance.now() + 350;
    const pop = this.pop;
    if (pop?.matches(':popover-open')) pop.hidePopover();
    if (tidyUp && tg.at >= 0 && !tg.draft) this.edit(tidy(this.doc, tg.at));
  }
  private shutAndFocus() {
    this.shut();
    this.querySelector<HTMLElement>('.dg-wrap')?.focus({ preventScroll: true });
  }

  private onOps = (e: CustomEvent<TextOps>) => {
    e.stopPropagation();
    const tg = this.target;
    if (!tg) return;
    const { ops, kind } = e.detail;
    if (tg.draft) {
      const block = applyAll({ head: {}, blocks: [tg.draft.block] }, ops).blocks[0] as Extract<Block, { k: 'li' }>;
      const d = tg.draft;
      // Nothing worth keeping typed yet: the draft waits, out of the document.
      if (charsOf(block.runs).trim() === charsOf(d.block.runs).trim()) return void (this.target = { ...tg, draft: { ...d, block } });
      this.edit(commitDraft(d, block), `line:${d.at}`);
      this.target = { hit: { k: 'line', at: d.at, part: 'all' }, at: d.at, draft: null, block: null, name: '' };
      return;
    }
    if (tg.at >= 0) {
      const before = this.doc;
      const mine = shifted(ops, tg.at);
      this.edit([...mine, ...follow(before, applyAll(before, mine), tg.at)], kind ? `line:${tg.at}` : undefined);
      return;
    }
    if (!tg.block || !tg.hit) return;
    const block = applyAll({ head: {}, blocks: [tg.block] }, ops).blocks[0] as Extract<Block, { k: 'li' }>;
    const now = plain(block);
    const done = rename(this.doc, tg.hit, tg.name, now);
    this.target = { ...tg, block, name: done.length || tg.hit.k === 'edge' ? now : tg.name, hit: tg.hit.k === 'lane' && done.length ? { k: 'lane', name: now } : tg.hit.k === 'node' && done.length ? { k: 'node', name: now } : tg.hit };
    this.edit(done, `name:${tg.hit.k}`);
  };
  /** Enter: the next thing like this one, typed where this one is. */
  private onEnter = (e: Event) => {
    e.stopPropagation();
    const tg = this.target;
    const anchor = this.pop ? this.anchorOf(tg) : null;
    const hit = tg?.hit;
    if (!tg || !hit || tg.draft || hit.k === 'edge') return this.shutAndFocus();
    const d = nextThing(this.doc, hit);
    this.shut();
    if (d && anchor) this.openDraft(d, anchor);
  };
  /** Backspace at the start: a thing with no words left goes. */
  private onExit = (e: Event) => {
    e.stopPropagation();
    const tg = this.target;
    const b = this.shown();
    if (!tg || !b) return;
    if (tg.draft) return this.shutAndFocus();
    if (tg.hit?.k === 'line') {
      const p = partFor(lineOf(b as Extract<Block, { k: 'li' }>, tg.at), tg.hit.part);
      if (p && !p.words && !p.icon) {
        const ops = removeThing(this.doc, tg.hit);
        this.shut(false);
        this.edit(ops);
      }
    }
  };
  private onPopKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    this.shutAndFocus();
  };

  /** Where the line editor sits: over the shape it edits, else over the place it was opened. */
  private anchorOf(tg: Target | null): Element | null {
    const i = tg ? this.indexOf(tg) : -1;
    return (i >= 0 ? this.querySelector(`.dg-pic g[data-i="${i}"]`) : null) ?? this.querySelector('.dg-anchor');
  }
  private indexOf(tg: Target): number {
    const h = tg.hit;
    if (!h) return -1;
    return this.view.d.shapes.findIndex((s) => s.hit && JSON.stringify(s.hit) === JSON.stringify(h));
  }

  /* ---------- the things to do to the thing open ---------- */

  private async iconFor(hit: Hit) {
    const { chooseIcon } = await import('../../kit/icons-picker.ts');
    const name = await chooseIcon({ none: true });
    if (name === null) return;
    this.edit(withIcon(this.doc, hit, name));
  }
  private actions(tg: Target) {
    const hit = tg.hit;
    if (!hit || tg.draft) return nothing;
    const kind = this.view.kind;
    const anchor = () => this.anchorOf(tg) ?? this;
    const add = (d: Draft | null) => {
      this.shut();
      if (d) this.openDraft(d, anchor());
    };
    const remove = () => {
      const ops = removeThing(this.doc, hit);
      this.shut(false);
      this.edit(ops);
      this.querySelector<HTMLElement>('.dg-wrap')?.focus({ preventScroll: true });
    };
    const name = hit.k === 'line' ? lineOf(this.doc.blocks[hit.at] as Extract<Block, { k: 'li' }>, hit.at).all.words : hit.k === 'edge' ? '' : hit.name;
    const join = () => {
      this.shut();
      this.joining = name;
    };
    const out: unknown[] = [];
    if (hit.k === 'line') {
      const addLabel = isTree(kind) ? t('Add under it') : isListed(kind) ? t('Add one more') : t('Add after it');
      out.push(btn({ label: addLabel, icon: isTree(kind) ? CornerDownRight : UI.plus, keep: true, does: () => add(isTree(kind) || isListed(kind) ? childOf(this.doc, hit.at) : nextThing(this.doc, hit)) }));
      out.push(tool({ label: t('Icon'), icon: Smile, keep: true, does: () => void this.iconFor(hit) }));
    }
    if (hit.k === 'lane') out.push(btn({ label: t('Add a step'), icon: UI.plus, keep: true, does: () => add(newThing(this.doc, hit.name)) }));
    if (joins(kind) && hit.k !== 'edge' && name) out.push(btn({ label: t('Join'), icon: Spline, keep: true, does: join }));
    if (hit.k === 'edge' && kind === 'net') {
      const e = edgesOf(this.doc).find((x) => x.at === hit.at);
      const arrow = e?.dir === '->' || e?.dir === '<-';
      out.push(tool({ label: arrow ? t('Make it a plain line') : t('Make it an arrow'), icon: arrow ? Minus : ArrowRight, keep: true, does: () => this.edit(setEdge(this.doc, hit.at, { dir: arrow ? '--' : '->' })) }));
    }
    out.push(tool({ label: t('Delete'), icon: UI.trash, keep: true, does: remove }));
    return html`<div class="dg-acts" role="group" aria-label=${t('This thing')}>${out}</div>`;
  }

  /* ---------- tapping, joining and dragging on the picture ---------- */

  private point(e: { clientX: number; clientY: number }): [number, number] {
    const el = this.querySelector<SVGSVGElement>('.dg-pic');
    const m = el?.getScreenCTM();
    if (!el || !m) return [0, 0];
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  }
  /** Put the anchor where the pointer is, for a line editor opened on empty space. */
  private anchorAt(e: { clientX: number; clientY: number }): HTMLElement {
    const a = this.querySelector<HTMLElement>('.dg-anchor')!;
    const box = this.querySelector<HTMLElement>('.dg-wrap')!.getBoundingClientRect();
    a.style.left = `${e.clientX - box.left + (a.parentElement?.scrollLeft ?? 0)}px`;
    a.style.top = `${e.clientY - box.top + (a.parentElement?.scrollTop ?? 0)}px`;
    return a;
  }
  /** A tap on the picture: on a thing, its words (or the other end of a connection being made); on empty space, a new thing there. */
  private onClick = (e: MouseEvent) => {
    if (performance.now() < this.quietUntil) return;
    const g = (e.target as Element).closest<SVGGElement>('g.dg-thing');
    const hit = g ? this.view.d.shapes[+g.dataset.i!]?.hit : undefined;
    if (this.target) return this.shut();
    if (this.joining !== null) {
      const from = this.joining;
      this.joining = null;
      if (hit && hit.k !== 'edge' && hit.k !== 'lane') this.edit(connect(this.doc, from, this.nameOf(hit)));
      return;
    }
    if (hit && g) return this.openHit(hit, g);
    const [x, y] = this.point(e);
    this.openDraft(newThing(this.doc, regionAt(this.view.d, x, y)), this.anchorAt(e));
  };
  private nameOf(hit: Hit): string {
    if (hit.k === 'line') {
      const b = this.doc.blocks[hit.at];
      return b?.k === 'li' ? lineOf(b, hit.at).all.words : '';
    }
    return hit.k === 'edge' ? '' : hit.name;
  }
  private onThingKey = (e: KeyboardEvent, i: number) => {
    const hit = this.view.d.shapes[i]?.hit;
    if (!hit) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.joining !== null) {
        const from = this.joining;
        this.joining = null;
        if (hit.k !== 'edge' && hit.k !== 'lane') this.edit(connect(this.doc, from, this.nameOf(hit)));
        return;
      }
      this.openHit(hit, e.currentTarget as Element);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.edit(removeThing(this.doc, hit));
    } else if (e.key === 'Escape' && this.joining !== null) this.joining = null;
  };
  private onDown = (e: PointerEvent) => {
    const g = (e.target as Element).closest<SVGGElement>('g.dg-thing');
    const i = g ? +g.dataset.i! : -1;
    const hit = this.view.d.shapes[i]?.hit;
    if (e.button !== 0 || !g || !hit || hit.k === 'edge' || hit.k === 'lane' || this.target) return;
    const [x, y] = this.point(e);
    this.drag = { i, hit, x, y, moved: false };
    try {
      g.setPointerCapture(e.pointerId);
    } catch {
      // A pointer the browser no longer knows of: the drag goes on without the capture.
    }
  };
  private onMove = (e: PointerEvent) => {
    const d = this.drag;
    if (!d) return;
    const [x, y] = this.point(e);
    if (!d.moved && Math.hypot(x - d.x, y - d.y) < 6) return;
    d.moved = true;
    const g = this.querySelector<SVGGElement>(`.dg-pic g[data-i="${d.i}"]`);
    g?.setAttribute('transform', `translate(${x - d.x} ${y - d.y})`);
    g?.classList.add('dragging');
    const over = this.overAt(e, g);
    this.querySelectorAll('.dg-pic g.over').forEach((el) => el !== over && el.classList.remove('over'));
    over?.classList.add('over');
  };
  /** The thing under the pointer, the one being dragged aside. */
  private overAt(e: PointerEvent, dragged: Element | null): SVGGElement | null {
    return (document.elementsFromPoint(e.clientX, e.clientY).map((el) => el.closest('g.dg-thing:not(.edge)')).find((el) => el && el !== dragged) as SVGGElement | null) ?? null;
  }
  private onUp = (e: PointerEvent) => {
    const d = this.drag;
    this.drag = null;
    if (!d || !d.moved) return;
    this.quietUntil = performance.now() + 400;
    const g = this.querySelector<SVGGElement>(`.dg-pic g[data-i="${d.i}"]`);
    g?.removeAttribute('transform');
    g?.classList.remove('dragging');
    const over = this.overAt(e, g);
    this.querySelectorAll('.dg-pic g.over').forEach((el) => el.classList.remove('over'));
    const onto = over ? this.view.d.shapes[+over.dataset.i!]?.hit : undefined;
    if (onto && onto.k !== 'lane' && onto.k !== 'edge') return void this.edit(dropOn(this.doc, d.hit, onto));
    const [x, y] = this.point(e);
    const key = regionAt(this.view.d, x, y);
    if (key !== undefined) this.edit(dropIn(this.doc, d.hit, key));
  };
  private onCancel = () => {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    const g = this.querySelector<SVGGElement>(`.dg-pic g[data-i="${d.i}"]`);
    g?.removeAttribute('transform');
    g?.classList.remove('dragging');
  };

  /* ---------- the bar ---------- */

  private kindItems(): MenuItem[] {
    return KINDS.map((k) => ({ label: kindName(k), icon: KIND_ICON[k], checked: this.view.kind === k, does: () => (this.shut(), this.edit(setKind(this.doc, k))) }));
  }
  private inserts(): MenuItem[] {
    const kind = this.view.kind;
    return [
      {
        label: thingName(kind),
        icon: UI.plus,
        does: () => {
          this.shut();
          const wrap = this.querySelector<HTMLElement>('.dg-wrap')!.getBoundingClientRect();
          this.openDraft(newThing(this.doc), this.anchorAt({ clientX: wrap.left + Math.min(wrap.width / 2, 160), clientY: wrap.top + 24 }));
        },
      },
    ];
  }
  private zoomBy(by: number) {
    const wrap = this.querySelector<HTMLElement>('.dg-wrap');
    const now = this.zoom || Math.min(1, (wrap?.clientWidth ?? this.view.d.w) / this.view.d.w);
    this.zoom = Math.max(0.25, Math.min(3, Math.round((now + by) * 4) / 4));
  }

  /* ---------- drawing ---------- */

  private thing(s: DShape, i: number, all: DShape[], on: number) {
    const hit = s.hit;
    const body = unsafeSVG(shapeSvg(s, all, THEME, !!hit));
    if (!hit) return svg`<g>${body}</g>`;
    const words = s.text.replace(/^:[a-z0-9-]+\s*/, '') || (isLink(s.k) ? t('a connection') : t('empty'));
    return svg`<g class="dg-thing ${hit.k === 'edge' ? 'edge' : ''} ${i === on ? 'on' : ''}" data-i=${i} tabindex="0" role="button" aria-label=${words} @keydown=${(e: KeyboardEvent) => this.onThingKey(e, i)}>${body}</g>`;
  }
  render() {
    const { kind, d } = this.view;
    const tg = this.target;
    const on = tg ? this.indexOf(tg) : -1;
    const shown = this.shown();
    const width = this.zoom ? `width:${Math.round(d.w * this.zoom)}px;max-width:none` : `width:100%;max-width:${d.w}px`;
    const hint = this.joining !== null ? t('Tap the thing to join {name} to; tap empty space to stop.', { name: this.joining }) : kindHint(kind);
    return html`<to-bar class="dg-bar">
        <to-menu class="dg-kind" caret .label=${kindName(kind)} .icon=${KIND_ICON[kind]} .items=${this.kindItems()}></to-menu>
        <to-insert .items=${this.inserts()}></to-insert>
        ${tool({ label: t('Zoom out'), icon: ZoomOut, does: () => this.zoomBy(-0.25) })}
        ${tool({ label: t('Zoom in'), icon: ZoomIn, does: () => this.zoomBy(0.25) })}
        ${tool({ label: t('Undo'), icon: UI.undo, keys: 'Mod+Z', keep: true, disabled: !this.canUndo, does: () => this.dispatchEvent(new CustomEvent('docundo', { cancelable: true })) })}
        ${tool({ label: t('Redo'), icon: UI.redo, keys: 'Mod+Shift+Z', keep: true, disabled: !this.canRedo, does: () => this.dispatchEvent(new CustomEvent('docredo', { cancelable: true })) })}
      </to-bar>
      <p class="dg-hint to-hint" aria-live="polite">${hint}</p>
      <div class="dg-wrap ${this.joining !== null ? 'joining' : ''}" tabindex="-1" @click=${this.onClick}>
        <svg class="dg-pic" viewBox="0 0 ${d.w} ${d.h}" style=${width} xmlns="http://www.w3.org/2000/svg" role="group" aria-label=${kindName(kind)}
          @pointerdown=${this.onDown} @pointermove=${this.onMove} @pointerup=${this.onUp} @pointercancel=${this.onCancel}>
          <defs>${unsafeSVG(arrowDefs('var(--to-ink)'))}</defs>
          ${d.shapes.map((s, i) => this.thing(s, i, d.shapes, on))}
        </svg>
        ${d.shapes.length ? nothing : html`<p class="dg-empty to-hint">${t('Tap here to add the first {thing}.', { thing: thingName(kind).toLowerCase() })}</p>`}
        <span class="dg-anchor" aria-hidden="true"></span>
      </div>
      <div class="dg-pop" popover="manual" @keydown=${this.onPopKey}>
        ${shown
          ? html`<to-text shape="line" .blocks=${this.one(shown)} label=${tg?.hit?.k === 'edge' ? t('What the connection says') : thingName(kind)} placeholder=${tg?.hit?.k === 'edge' ? t('What the connection says') : tg?.hit?.k === 'lane' ? t('Who') : lineHint(kind)}
              @text-ops=${this.onOps} @text-enter=${this.onEnter} @text-exit=${this.onExit}></to-text>`
          : nothing}
        ${tg ? this.actions(tg) : nothing}
      </div>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToDiagramEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-diagram-editor': ToDiagramEditor;
  }
}
