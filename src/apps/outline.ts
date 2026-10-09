/**
 * <to-outline>: an outliner. Every line is an item; Enter makes another,
 * Tab and Shift+Tab take it in and out with its family, Alt+arrows move
 * and fold it, a handle drags it onto another item, and any item can be
 * zoomed in on. A bar that stays under the header indents, moves, zooms
 * and connects the chosen item. Each item's bullet is the line to its
 * parent: tapped, it turns through plain, an arrow out, an arrow back and
 * both ways; the plus beside it names the line. Connect joins any two
 * items. Format: a nested list, lib/outlinemodel.ts.
 */
import { DocElement, defineElement, html, nothing, state, tool, icon, UI, isKey, editRef, insertOptions, insertedRef, SELF, appOf, apps, convert, hashOf, type TemplateResult, type SlInput, btn } from '../kit.ts';
import { blockEnd, hasChildren, liveLinks, move, parentOf, place, readTree, remove, serializeOutline, shift, type Dir, type Item, type Link } from '../lib/outlinemodel.ts';
import '../widgets/insert-box.ts';
import { plainInline } from '../lib/richtext.ts';
import { DIR_NAME } from './outline.def.ts';
import './write.ts';
import type { ToWrite } from './write.ts';
import './outline.css';

export class ToOutline extends DocElement<Item[]> {
  /** Items folded shut (by index), and the item zoomed in on (-1 for the whole outline). For this visit. */
  @state() private folded = new Set<number>();
  @state() private zoom = -1;
  @state() private sel = -1;
  /** The joins between any two items, kept beside the items and written after them. */
  @state() private links: Link[] = [];
  /** The bullet whose menu is open: item i's ("i3"), or a join's ("l0"). */
  @state() private menuFor = '';
  /** Connecting: the item the join starts from (-1 until it is picked); null when not connecting. */
  @state() private connecting: { from: number } | null = null;
  private field: ToWrite | null = null;
  private drag: { i: number; over: number; how: 'under' | 'after' } | null = null;

  protected parse(text: string) {
    const { items, links } = readTree(text);
    this.links = links;
    return items;
  }
  protected serialize(items: Item[]) {
    return serializeOutline(items, liveLinks(items, this.links));
  }

  private save(items: Item[], focus = this.sel) {
    this.commit(items);
    if (focus >= 0) this.focusItem(focus);
  }
  /** Choose item i and put the cursor at the end of its words. */
  private focusItem(i: number) {
    this.sel = i;
    void this.updateComplete.then(() => {
      const box = this.querySelector<HTMLElement>(`.ol-row[data-i="${i}"] .write-page`);
      if (!box) return;
      box.focus();
      const range = document.createRange();
      range.selectNodeContents(box);
      range.collapse(false);
      const sel = getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
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

  private patchItem(i: number, change: Partial<Item>) {
    this.commit(this.doc.map((it, n) => (n === i ? { ...it, ...change } : it)));
  }
  private setText(i: number, text: string) {
    // Joins name items by their words, so they follow a renamed item (when no other item has its old name).
    const was = this.doc[i].text.trim();
    if (was && !this.doc.some((it, n) => n !== i && it.text.trim() === was)) this.links = this.links.map((l) => ({ ...l, from: l.from === was ? text.trim() : l.from, to: l.to === was ? text.trim() : l.to }));
    this.patchItem(i, { text });
  }

  /* ---------- lines between items ---------- */

  /** The joins are kept beside the items, so a change to them is written by committing the items again. */
  private saveLinks(links: Link[]) {
    this.links = links;
    this.commit(this.doc);
  }
  private patchLink(k: number, change: Partial<Link>) {
    this.saveLinks(this.links.map((l, n) => (n === k ? { ...l, ...change } : l)));
  }
  private unlink(k: number) {
    this.saveLinks(this.links.filter((_, n) => n !== k));
  }
  /** Connect: start from the chosen item, or pick one first; everything else goes grey until the other end is tapped. */
  private connect() {
    this.connecting = this.connecting ? null : { from: this.sel >= 0 && this.doc[this.sel].text.trim() && !this.doc[this.sel].doc ? this.sel : -1 };
  }
  private pick(i: number) {
    const c = this.connecting;
    if (!c) return;
    if (c.from < 0) return void (this.connecting = { from: i });
    const [from, to] = [this.doc[c.from].text.trim(), this.doc[i].text.trim()];
    this.connecting = null;
    if (from === to || this.links.some((l) => (l.from === from && l.to === to) || (l.from === to && l.to === from))) return;
    this.saveLinks([...this.links, { from, to, dir: '--' }]);
  }

  /** Open the menu of bullet `key`: it is drawn only once asked for. */
  private async openMenu(key: string) {
    this.menuFor = key;
    await this.updateComplete;
    void (this.querySelector('.ol-menu') as (HTMLElement & { show(): Promise<void> }) | null)?.show();
  }

  /**
   * The bullet that is a line: a dot, or an arrow which way it points.
   * Tapped, it opens what can be said of the line: its kind, each named,
   * and its name; for an item with something under it, zooming in; for a
   * join, taking it away. The menu is drawn only for the bullet tapped.
   */
  private bullet(key: string, o: { dir: Dir; label?: string; said: string; from: string; to: string; onDir(d: Dir): void; onName(v: string): void; zoom?: () => void; remove?: () => void }) {
    const glyph = o.dir === '->' ? UI.arrow : o.dir === '<-' ? UI.arrowLeft : o.dir === '<->' ? UI.arrowBoth : null;
    const face = glyph ? icon(glyph, 14) : html`<span></span>`;
    const label = `${o.said}: ${DIR_NAME[o.dir]}${o.label ? `, named “${o.label}”` : ''}. Change it`;
    if (this.menuFor !== key) return html`<button class="ol-kind" data-dir=${o.dir} aria-label=${label} aria-haspopup="menu" data-tip="Kind of line, its name" @mousedown=${(e: Event) => e.preventDefault()} @click=${() => this.openMenu(key)}>${face}</button>`;
    const kinds: [Dir, string, keyof typeof UI | null][] = [
      ['--', 'Plain line', null],
      ['->', `Arrow from ${o.from} to ${o.to}`, 'arrow'],
      ['<-', `Arrow from ${o.to} to ${o.from}`, 'arrowLeft'],
      ['<->', 'Arrows both ways', 'arrowBoth'],
    ];
    return html`<sl-dropdown class="ol-menu" hoist placement="bottom-start" @sl-after-hide=${(e: Event) => e.target === e.currentTarget && (this.menuFor = '')}
      @sl-select=${(e: CustomEvent) => {
        const v = String(e.detail.item.value);
        if (v === 'zoom') o.zoom?.();
        else if (v === 'remove') o.remove?.();
        else o.onDir(v as Dir);
      }}>
      <button slot="trigger" class="ol-kind" data-dir=${o.dir} aria-label=${label}>${face}</button>
      <sl-menu class="ol-menu-list">
        <sl-menu-label>${o.said}</sl-menu-label>
        ${kinds.map(([d, name, g]) => html`<sl-menu-item type="checkbox" value=${d} ?checked=${o.dir === d}>${g ? icon(UI[g], 14, 'pre') : html`<span class="ol-dot pre"></span>`} ${name}</sl-menu-item>`)}
        <div class="ol-menu-name" @keydown=${(e: KeyboardEvent) => e.stopPropagation()} @click=${(e: Event) => e.stopPropagation()}>
          <sl-input size="small" label="Name of the line" placeholder="e.g. owns, feeds, reports to" .value=${o.label ?? ''} @sl-change=${(e: Event) => o.onName((e.target as SlInput).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (o.onName((e.target as SlInput).value), (this.querySelector('.ol-menu') as HTMLElement & { hide(): void } | null)?.hide())}></sl-input>
        </div>
        ${o.zoom || o.remove ? html`<sl-divider></sl-divider>` : nothing}
        ${o.zoom ? html`<sl-menu-item value="zoom">${icon(UI.zoomIn, 14, 'pre')} Zoom in</sl-menu-item>` : nothing}
        ${o.remove ? html`<sl-menu-item value="remove" class="danger">${icon(UI.trash, 14, 'pre')} Take the connection away</sl-menu-item>` : nothing}
      </sl-menu>
    </sl-dropdown>`;
  }
  /** A line's name, as a chip before the words; tapped, it opens the bullet's menu. */
  private chip(key: string, label?: string) {
    if (!label) return nothing;
    return html`<button class="ol-label" aria-label=${`Line named “${label}”: change it`} @click=${() => this.openMenu(key)}>${label}</button>`;
  }
  /** Item i's bullet, the line to its parent p, and the line's name. */
  private lineToParent(i: number, p: number, kids: boolean) {
    const it = this.doc[i];
    const parent = plainInline(this.doc[p].text) || 'the item above';
    const said = `Line from ${parent} to ${plainInline(it.text) || `item ${i + 1}`}`;
    const bullet = this.bullet(`i${i}`, { dir: it.dir ?? '--', label: it.label, said, from: parent, to: plainInline(it.text) || 'this', onDir: (dir) => this.patchItem(i, { dir: dir === '--' ? undefined : dir }), onName: (v) => this.patchItem(i, { label: v.trim() || undefined }), zoom: kids ? () => this.zoomTo(i) : undefined });
    return html`<span class="ol-bullet">${bullet}</span>${this.chip(`i${i}`, it.label)}`;
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
    const ref = insertedRef(what);
    this.commit([...this.doc.slice(0, at), { depth, text: '', doc: ref }, ...this.doc.slice(at)]);
    if (what === 'qr-self') return;
    this.patchItem(at, { doc: await editRef(ref) });
  }
  private async editDoc(i: number) {
    const ref = this.doc[i].doc;
    if (!ref || ref === SELF) return;
    this.patchItem(i, { doc: await editRef(ref) });
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
    if (this.zoom >= 0) this.zoomTo(parentOf(this.doc, this.zoom));
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
    // The item zoomed in on, and the items it is under.
    const trail: number[] = [];
    for (let p = this.zoom; p >= 0; p = parentOf(items, p)) trail.unshift(p);
    return html`<nav class="ol-crumbs" aria-label="Zoomed in on">
      <button @click=${() => this.zoomTo(-1)}>${icon(UI.home, 14)} Everything</button>
      ${trail.map((p) => html`<span aria-hidden="true">›</span><button @click=${() => this.zoomTo(p)} aria-current=${p === this.zoom ? 'true' : 'false'}>${plainInline(items[p].text) || 'Untitled'}</button>`)}
    </nav>`;
  }

  /** The bar under the header, there however far the outline is scrolled: what to do with the chosen item. */
  /** The outline seen as another kind of document, in a new tab: a mind map, a deck, a list of tasks. */
  private viewAs() {
    const from = appOf('outline')!;
    const choices = apps().filter((d) => d.id !== 'outline' && d.id !== 'write' && (from.into?.[d.id] || d.read)).map((d) => ({ d, body: convert(from, this.serialize(this.doc), d) })).filter((c) => c.body.trim());
    return html`<sl-dropdown hoist>
      <sl-button slot="trigger" size="small" caret aria-label="View as">${icon(UI.compare, 14)} View as</sl-button>
      <sl-menu>${choices.map(({ d, body }) => html`<sl-menu-item @click=${() => window.open(hashOf(d.id, body), '_blank', 'noopener')}>${icon(UI[d.icon as keyof typeof UI] ?? UI.write, 14, 'pre')} ${d.name}</sl-menu-item>`)}</sl-menu>
    </sl-dropdown>`;
  }

  /** The joins, under the outline: each with its kind of line, its name, and a way to take it away. */
  private renderLinks() {
    if (!this.links.length) return nothing;
    const known = new Set(this.doc.map((it) => it.text.trim()));
    return html`<section class="ol-links" aria-label="Connections">
      <h3>Connections</h3>
      ${this.links.map((l, k) => {
        if (!known.has(l.from) || !known.has(l.to)) return nothing;
        const said = `Connection from ${plainInline(l.from)} to ${plainInline(l.to)}`;
        return html`<div class="ol-link">
          <span class="ol-end">${plainInline(l.from)}</span>
          ${this.bullet(`l${k}`, { dir: l.dir, label: l.label, said, from: plainInline(l.from), to: plainInline(l.to), onDir: (dir) => this.patchLink(k, { dir }), onName: (v) => this.patchLink(k, { label: v.trim() || undefined }), remove: () => this.unlink(k) })}
          ${this.chip(`l${k}`, l.label)}
          <span class="ol-end">${plainInline(l.to)}</span>
          ${btn(`Take away ${said.toLowerCase()}`, 'close', () => this.unlink(k), { size: 13, tip: 'Take it away' })}
        </div>`;
      })}
    </section>`;
  }

  render() {
    const items = this.doc;
    const vis = this.visible();
    const base = this.zoom >= 0 ? items[this.zoom].depth : 0;
    const s = this.sel;
    const none = s < 0 || s >= items.length;
    const c = this.connecting;
    return html`
      <div class="to-toolbar" role="toolbar" aria-label="Outline">
        <to-insert label="Insert" .options=${[{ value: 'item', label: 'Item', group: '', icon: 'plus' as const }, ...insertOptions('outline')]} @pick=${(e: CustomEvent<string>) => (e.detail === 'item' ? this.save([...items, { depth: base, text: '' }], items.length) : this.insertDoc(e.detail))}></to-insert>
        <sl-button-group label="Text">
          ${tool('Bold', 'bold', () => this.field?.exec('bold'), { key: 'Mod+B' })}${tool('Italic', 'italic', () => this.field?.exec('italic'), { key: 'Mod+I' })}${tool('Underline', 'underline', () => this.field?.exec('underline'), { key: 'Mod+U' })}${tool('Strikethrough', 'strike', () => this.field?.exec('strikeThrough'))}${tool('Highlight', 'highlight', () => this.field?.highlight())}${tool('Link', 'link', () => void this.field?.link(), { key: 'Mod+K', keepFocus: true })}${tool('Icon in text', 'smile', () => this.field?.insertIcon())}
        </sl-button-group>
        <sl-button-group label="Arrange">
          ${tool('Bring out', 'shiftOut', () => this.shiftBy(s, -1), { disabled: none, keepFocus: true, key: 'Shift+Tab' })}${tool('Indent', 'shiftIn', () => this.shiftBy(s, 1), { disabled: none, keepFocus: true, key: 'Tab' })}
          ${tool('Move up', 'up', () => this.moveBy(s, -1), { disabled: none, keepFocus: true, key: 'Alt+ArrowUp' })}${tool('Move down', 'down', () => this.moveBy(s, 1), { disabled: none, keepFocus: true, key: 'Alt+ArrowDown' })}
        </sl-button-group>
        <sl-button-group label="View">
          ${this.zoom >= 0 ? tool('Zoom out', 'left', () => this.zoomOut(), { key: 'Mod+,' }) : nothing}
          ${tool('Zoom in', 'zoomIn', () => this.zoomTo(s), { disabled: none || !hasChildren(items, s), keepFocus: true, key: 'Mod+.' })}${tool('Fold all', 'foldAll', () => this.foldAll(true), { keepFocus: true })}${tool('Unfold all', 'unfoldAll', () => this.foldAll(false), { keepFocus: true })}
        </sl-button-group>
        ${tool(c ? 'Cancel connecting' : 'Connect', c ? 'close' : 'link', () => this.connect(), { text: true, pressed: !!c })}
        ${c ? html`<span class="to-hint ol-nav-hint" role="status">${c.from < 0 ? 'Tap the item to connect from.' : html`Tap the item to connect <b>${plainInline(items[c.from].text)}</b> to.`}</span>` : nothing}
        ${this.viewAs()}
        <span class="to-spacer"></span>
        <span class="to-hint">${items.filter((it) => it.text.trim()).length} items</span>
      </div>
      ${this.crumbs()}
      <div class="ol ${this.connecting ? 'connecting' : ''}" role="tree" aria-label="Outline" @drop=${this.onDrop} @dragover=${(e: DragEvent) => this.drag && e.preventDefault()} @keydown=${(e: KeyboardEvent) => this.connecting && e.key === 'Escape' && (this.connecting = null)}>
        ${vis.map((i) => {
          const it = items[i];
          const kids = hasChildren(items, i);
          const shut = this.folded.has(i);
          const parent = parentOf(items, i);
          const d = this.drag;
          return html`<div
            class="ol-row ${i === this.sel ? 'sel' : ''} ${kids ? 'parent' : ''} ${kids && shut ? 'shut' : ''} ${d?.over === i ? `drop-${d.how}` : ''} ${this.connecting?.from === i ? 'source' : ''}"
            data-i=${i}
            role="treeitem"
            aria-level=${it.depth - base + 1}
            aria-expanded=${kids ? (shut ? 'false' : 'true') : nothing}
            style="--d:${it.depth - base}"
            @dragover=${(e: DragEvent) => this.onDragOver(e, i)}
            @keydown=${(e: KeyboardEvent) => this.onKey(e, i)}
          >
            <span class="ol-gutter">
              <button class="ol-handle" draggable="true" aria-label="Move this item: drag it onto another" data-tip="Drag to move" @dragstart=${(e: DragEvent) => this.onDragStart(e, i)} @dragend=${() => ((this.drag = null), this.requestUpdate())} tabindex="-1">${icon(UI.grip, 13)}</button>
              ${kids ? html`<button class="ol-fold" aria-label=${shut ? `Unfold, ${blockEnd(items, i) - i - 1} inside` : 'Fold'} @click=${() => this.fold(i)}>${icon(shut ? UI.right : UI.down, 13)}</button>` : nothing}
            </span>
            ${parent >= 0
              ? this.lineToParent(i, parent, kids)
              : html`<span class="ol-bullet"><span class="ol-kind root" aria-hidden="true"><span></span></span></span>`}
            ${it.doc
              ? html`<to-embed class="ol-doc" ref=${it.doc} controls tabindex="0" @focusin=${() => (this.sel = i)} @embed-edit=${() => this.editDoc(i)} @embed-remove=${() => this.save(remove(items, i), Math.max(0, i - 1))}></to-embed>`
              : html`<to-rich mode="line" .tools=${false} label=${`Item ${i + 1}`} placeholder=${i === 0 && items.length === 1 ? 'Start with an idea; Enter for the next; Tab to put it under' : ''} .value=${it.text} @focusin=${(e: Event) => ((this.field = e.currentTarget as ToWrite), (this.sel = i))} @rich-change=${(e: CustomEvent<string>) => this.setText(i, e.detail)} @rich-enter=${() => this.enter(i)}></to-rich>`}
            ${kids && shut ? html`<span class="to-count ol-count" aria-hidden="true">${blockEnd(items, i) - i - 1}</span>` : nothing}
            ${this.connecting && it.text.trim() && !it.doc && i !== this.connecting.from
              ? html`<button class="ol-pick" aria-label=${this.connecting.from < 0 ? `Connect from “${plainInline(it.text)}”` : `Connect “${plainInline(items[this.connecting.from].text)}” to “${plainInline(it.text)}”`} @click=${() => this.pick(i)}></button>`
              : nothing}
          </div>`;
        })}
        <div class="ol-below" aria-hidden="true" @click=${() => (items[items.length - 1]?.text.trim() || items[items.length - 1]?.doc ? this.save([...items, { depth: base, text: '' }], items.length) : this.focusItem(items.length - 1))}></div>
      </div>
      ${this.renderLinks()}
    `;
  }
}
defineElement('outline', ToOutline);

declare global {
  interface HTMLElementTagNameMap {
    'to-outline': ToOutline;
  }
}
