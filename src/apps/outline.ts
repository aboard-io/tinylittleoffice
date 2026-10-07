/**
 * <to-outline>: an outliner. Every line is an item; Enter makes another,
 * Tab and Shift+Tab take it in and out with its family, Alt+arrows move
 * and fold it, a handle drags it onto another item, and any item can be
 * zoomed in on. Format: lib/outlinemodel.ts.
 */
import { DocElement, defineElement, html, nothing, state, tool, icon, UI, isKey, editRef, insertOptions, makeRef, SELF, type TemplateResult } from '../kit.ts';
import { blockEnd, embedOf, hasChildren, move, outlineToDeck, parseOutline, place, remove, serializeOutline, shift, type Item } from '../lib/outlinemodel.ts';
import '../widgets/insert-box.ts';
import { plainInline } from '../lib/richtext.ts';
import { outlineAs } from './outline.def.ts';
import './write.ts';
import type { ToWrite } from './write.ts';
import './outline.css';

export class ToOutline extends DocElement<Item[]> {
  /** Items folded shut (by index), and the item zoomed in on (-1 for the whole outline). For this visit. */
  @state() private folded = new Set<number>();
  @state() private zoom = -1;
  @state() private sel = -1;
  private field: ToWrite | null = null;
  private drag: { i: number; over: number; how: 'under' | 'after' } | null = null;

  protected parse(text: string) {
    return parseOutline(text);
  }
  protected serialize(items: Item[]) {
    return serializeOutline(items);
  }

  private save(items: Item[], focus = this.sel) {
    this.commit(items);
    if (focus >= 0) this.focusItem(focus);
  }
  private focusItem(i: number, atEnd = true) {
    this.sel = i;
    void this.updateComplete.then(() => {
      const box = this.querySelector<HTMLElement>(`.ol-row[data-i="${i}"] .write-page`);
      if (!box) return;
      box.focus();
      if (atEnd) {
        const range = document.createRange();
        range.selectNodeContents(box);
        range.collapse(false);
        const sel = getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
  }

  /** The rows on screen: those inside the zoom, not hidden under a fold. */
  private visible(): number[] {
    const items = this.doc;
    const from = this.zoom >= 0 ? this.zoom : 0;
    const to = this.zoom >= 0 ? blockEnd(items, this.zoom) : items.length;
    const out: number[] = [];
    let hideBelow = Infinity;
    for (let i = from; i < to; i++) {
      if (items[i].depth > hideBelow) continue;
      hideBelow = Infinity;
      out.push(i);
      if (this.folded.has(i)) hideBelow = items[i].depth;
    }
    return out;
  }

  /* ---------- changes ---------- */

  private setText(i: number, text: string) {
    this.commit(this.doc.map((it, n) => (n === i ? { ...it, text } : it)));
  }
  /** Enter: a new item right after this one (as its first child when it is open and has children). */
  private enter(i: number) {
    const items = this.doc;
    const kids = hasChildren(items, i) && !this.folded.has(i);
    const at = kids ? i + 1 : blockEnd(items, i);
    const depth = kids ? items[i].depth + 1 : items[i].depth;
    this.save([...items.slice(0, at), { depth, text: '' }, ...items.slice(at)], at);
  }
  private backspace(i: number) {
    if (this.doc[i].text.trim() || this.doc.length === 1) return false;
    const vis = this.visible();
    const before = vis[vis.indexOf(i) - 1] ?? -1;
    this.save(remove(this.doc, i), Math.max(0, before));
    return true;
  }
  private shiftBy(i: number, by: 1 | -1) {
    const next = shift(this.doc, i, by);
    if (next) this.save(next, i);
  }
  private moveBy(i: number, by: 1 | -1) {
    const r = move(this.doc, i, by);
    if (r) this.save(r[0], r[1]);
  }
  /** Another document as an item of its own, after the current one (or at the end). */
  private async insertDoc(what: string) {
    const items = this.doc;
    const i = this.sel >= 0 ? this.sel : items.length - 1;
    const at = this.sel >= 0 ? blockEnd(items, i) : items.length;
    const depth = this.sel >= 0 ? items[i].depth : 0;
    const ref = what === 'qr-self' ? SELF : what === 'chart' ? makeRef('sheet', '!bar') : makeRef(what, '');
    const put = (r: string) => this.commit([...this.doc.slice(0, at), { depth, text: '@@' + r }, ...this.doc.slice(at)]);
    put(ref);
    if (what === 'qr-self') return;
    const made = await editRef(ref);
    this.commit(this.doc.map((it, n) => (n === at ? { ...it, text: '@@' + made } : it)));
  }
  private async editDoc(i: number) {
    const ref = embedOf(this.doc[i].text);
    if (!ref || ref === SELF) return;
    const made = await editRef(ref);
    this.setText(i, '@@' + made);
  }

  private fold(i: number, shut = !this.folded.has(i)) {
    const f = new Set(this.folded);
    if (shut) f.add(i);
    else f.delete(i);
    this.folded = f;
  }
  private foldAll(shut: boolean) {
    this.folded = new Set(shut ? this.doc.map((_, i) => i).filter((i) => hasChildren(this.doc, i)) : []);
  }
  private zoomTo(i: number) {
    this.zoom = i;
    if (i >= 0) this.fold(i, false);
    this.focusItem(i >= 0 ? i : 0);
  }
  private zoomOut() {
    if (this.zoom < 0) return;
    const items = this.doc;
    let p = this.zoom - 1;
    while (p >= 0 && items[p].depth >= items[this.zoom].depth) p--;
    this.zoomTo(p);
  }

  private onKey(e: KeyboardEvent, i: number) {
    const vis = this.visible();
    const at = vis.indexOf(i);
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) (e.preventDefault(), this.shiftBy(i, e.shiftKey ? -1 : 1));
    else if (e.altKey && e.key === 'ArrowUp') (e.preventDefault(), this.moveBy(i, -1));
    else if (e.altKey && e.key === 'ArrowDown') (e.preventDefault(), this.moveBy(i, 1));
    else if (e.altKey && e.key === 'ArrowLeft') (e.preventDefault(), this.fold(i, true));
    else if (e.altKey && e.key === 'ArrowRight') (e.preventDefault(), this.fold(i, false));
    else if (e.key === 'ArrowUp' && !e.shiftKey && at > 0) (e.preventDefault(), this.focusItem(vis[at - 1]));
    else if (e.key === 'ArrowDown' && !e.shiftKey && at < vis.length - 1) (e.preventDefault(), this.focusItem(vis[at + 1]));
    else if (e.key === 'Backspace' && this.backspace(i)) e.preventDefault();
    else if (isKey(e, 'Mod+.')) (e.preventDefault(), this.zoomTo(i));
    else if (isKey(e, 'Mod+,')) (e.preventDefault(), this.zoomOut());
  }

  /* ---------- dragging ---------- */

  private onDragStart(e: DragEvent, i: number) {
    this.drag = { i, over: -1, how: 'after' };
    e.dataTransfer?.setData('text/plain', this.doc[i].text);
    e.dataTransfer!.effectAllowed = 'move';
  }
  private onDragOver(e: DragEvent, i: number) {
    if (!this.drag || i === this.drag.i) return;
    e.preventDefault();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // The right half of a row means "inside it"; the rest, "after it".
    const how = e.clientX - r.left > r.width * 0.5 || e.clientX - r.left > 48 + this.doc[i].depth * 24 + 40 ? 'under' : 'after';
    if (this.drag.over !== i || this.drag.how !== how) {
      this.drag = { ...this.drag, over: i, how };
      this.requestUpdate();
    }
  }
  private onDrop(e: DragEvent) {
    e.preventDefault();
    const d = this.drag;
    this.drag = null;
    if (!d || d.over < 0) return this.requestUpdate();
    const next = place(this.doc, d.i, d.over, d.how);
    if (next) {
      const moved = next.findIndex((it, n) => it === this.doc[d.i] || (it.text === this.doc[d.i].text && n !== d.i && !this.doc.includes(it)));
      this.save(next, moved >= 0 ? moved : -1);
    } else this.requestUpdate();
  }

  /* ---------- drawn ---------- */

  private crumbs(): TemplateResult | typeof nothing {
    if (this.zoom < 0) return nothing;
    const items = this.doc;
    const trail: number[] = [];
    for (let p = this.zoom; p >= 0; p--) if (items[p].depth < (trail.length ? items[trail[0]].depth : items[this.zoom].depth + 1)) trail.unshift(p);
    return html`<nav class="ol-crumbs" aria-label="Zoomed in on">
      <button @click=${() => this.zoomTo(-1)}>${icon(UI.home, 14)} Everything</button>
      ${trail.map((p) => html`<span aria-hidden="true">›</span><button @click=${() => this.zoomTo(p)} aria-current=${p === this.zoom ? 'true' : 'false'}>${plainInline(items[p].text) || 'Untitled'}</button>`)}
    </nav>`;
  }

  render() {
    const items = this.doc;
    const vis = this.visible();
    const base = this.zoom >= 0 ? items[this.zoom].depth : 0;
    return html`
      <div class="to-toolbar" role="toolbar" aria-label="Outline">
        <sl-button-group label="Text">
          ${tool('Bold', 'bold', () => this.field?.exec('bold'))}${tool('Italic', 'italic', () => this.field?.exec('italic'))}${tool('Highlight', 'highlight', () => this.field?.highlight())}${tool('Icon in text', 'smile', () => this.field?.insertIcon())}
        </sl-button-group>
        <sl-button-group label="Arrange">
          ${tool('Bring out', 'outdent', () => this.sel >= 0 && this.shiftBy(this.sel, -1), { disabled: this.sel < 0 })}${tool('Indent', 'indent', () => this.sel >= 0 && this.shiftBy(this.sel, 1), { disabled: this.sel < 0 })}
          ${tool('Move up', 'up', () => this.sel >= 0 && this.moveBy(this.sel, -1), { disabled: this.sel < 0 })}${tool('Move down', 'down', () => this.sel >= 0 && this.moveBy(this.sel, 1), { disabled: this.sel < 0 })}
        </sl-button-group>
        <sl-button-group label="Folding">
          ${tool('Unfold all', 'down', () => this.foldAll(false), { text: true })}${tool('Fold all', 'right', () => this.foldAll(true), { text: true })}
        </sl-button-group>
        ${this.zoom >= 0 ? tool('Zoom out', 'left', () => this.zoomOut(), { text: true }) : nothing}
        <to-insert label="Insert" placeholder="Insert a document…" .options=${insertOptions('outline')} @pick=${(e: CustomEvent<string>) => this.insertDoc(e.detail)}></to-insert>
        <sl-dropdown hoist @sl-select=${(e: CustomEvent) => (location.hash = '#/v2/' + (e.detail.item.value === 'deck' ? makeRef('deck', outlineToDeck(items)) : outlineAs(e.detail.item.value, serializeOutline(items))))}>
          <sl-button slot="trigger" size="small" caret>${icon(UI.mind, 14)} See as</sl-button>
          <sl-menu>
            <sl-menu-item value="deck">${icon(UI.deck, 14, 'pre')} Deck: a slide for every level</sl-menu-item>
            <sl-menu-item value="mind">${icon(UI.mind, 14, 'pre')} Mind map</sl-menu-item>
            <sl-menu-item value="org">${icon(UI.org, 14, 'pre')} Org chart</sl-menu-item>
            <sl-menu-item value="family">${icon(UI.family, 14, 'pre')} Family tree</sl-menu-item>
          </sl-menu>
        </sl-dropdown>
        <span class="to-spacer"></span>
        <span class="to-hint">${items.filter((it) => it.text.trim()).length} items</span>
      </div>
      ${this.crumbs()}
      <div class="ol" role="tree" aria-label="Outline" @drop=${this.onDrop} @dragover=${(e: DragEvent) => this.drag && e.preventDefault()}>
        ${vis.map((i) => {
          const it = items[i];
          const kids = hasChildren(items, i);
          const shut = this.folded.has(i);
          const d = this.drag;
          return html`<div
            class="ol-row ${i === this.sel ? 'sel' : ''} ${d?.over === i ? `drop-${d.how}` : ''}"
            data-i=${i}
            role="treeitem"
            aria-level=${it.depth - base + 1}
            aria-expanded=${kids ? (shut ? 'false' : 'true') : (undefined as unknown as string)}
            style="--d:${it.depth - base}"
            @dragover=${(e: DragEvent) => this.onDragOver(e, i)}
            @keydown=${(e: KeyboardEvent) => this.onKey(e, i)}
          >
            <button class="ol-handle" draggable="true" aria-label="Move this item: drag it onto another" title="Drag to move" @dragstart=${(e: DragEvent) => this.onDragStart(e, i)} @dragend=${() => ((this.drag = null), this.requestUpdate())} tabindex="-1">${icon(UI.grip, 14)}</button>
            ${kids
              ? html`<button class="ol-fold" aria-label=${shut ? `Unfold, ${blockEnd(items, i) - i - 1} inside` : 'Fold'} @click=${() => this.fold(i)}>${icon(shut ? UI.right : UI.down, 14)}</button>`
              : html`<button class="ol-dot" aria-label="Zoom in on this item" title="Zoom in" @click=${() => this.zoomTo(i)}><span></span></button>`}
            ${embedOf(it.text)
              ? html`<to-embed class="ol-doc" ref=${embedOf(it.text)!} controls tabindex="0" @focusin=${() => (this.sel = i)} @embed-edit=${() => this.editDoc(i)} @embed-remove=${() => this.save(remove(items, i), Math.max(0, i - 1))}></to-embed>`
              : html`<to-rich mode="line" .tools=${false} label=${`Item ${i + 1}`} placeholder=${i === 0 && items.length === 1 ? 'Start with an idea; Enter for the next; Tab to put it under' : ''} .value=${it.text} @focusin=${(e: Event) => ((this.field = e.currentTarget as ToWrite), (this.sel = i))} @rich-change=${(e: CustomEvent<string>) => this.setText(i, e.detail)} @rich-enter=${() => this.enter(i)}></to-rich>`}
            ${kids && shut ? html`<span class="ol-count" aria-hidden="true">${blockEnd(items, i) - i - 1}</span>` : nothing}
          </div>`;
        })}
        <button class="ol-add" @click=${() => this.save([...items, { depth: base, text: '' }], items.length)}>${icon(UI.plus, 14)} Add an item</button>
      </div>
    `;
  }
}
defineElement('outline', ToOutline);

declare global {
  interface HTMLElementTagNameMap {
    'to-outline': ToOutline;
  }
}
