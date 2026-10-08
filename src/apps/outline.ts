/**
 * <to-outline>: an outliner. Every line is an item; Enter makes another,
 * Tab and Shift+Tab take it in and out with its family, Alt+arrows move
 * and fold it, a handle drags it onto another item, and any item can be
 * zoomed in on. A bar that stays under the header indents, moves, zooms
 * and connects the chosen item. Each item's bullet is the line to its
 * parent: tapped, it turns through plain, an arrow out, an arrow back and
 * both ways; the plus beside it names the line. Connect joins any two
 * items. Format: lib/outlinemodel.ts.
 */
import { LINK, DocElement, defineElement, html, nothing, state, tool, icon, UI, isKey, editRef, insertOptions, makeRef, SELF, type TemplateResult, btn } from '../kit.ts';
import { DIRS, blockEnd, embedOf, hasChildren, move, outlineToDeck, parentOf, parseLinks, parseOutline, place, remove, serializeOutline, shift, type Dir, type Item, type Link } from '../lib/outlinemodel.ts';
import '../widgets/insert-box.ts';
import { plainInline } from '../lib/richtext.ts';
import { DIR_NAME, outlineAs } from './outline.def.ts';
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
  /** The name being written: of item i's line to its parent ("i3"), or of a join ("l0"). */
  @state() private naming = '';
  /** Connecting: the item the join starts from (-1 until it is picked); null when not connecting. */
  @state() private connecting: { from: number } | null = null;
  private field: ToWrite | null = null;
  private drag: { i: number; over: number; how: 'under' | 'after' } | null = null;

  protected parse(text: string) {
    this.links = parseLinks(text);
    return parseOutline(text);
  }
  protected serialize(items: Item[]) {
    return serializeOutline(items, this.links);
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
    // Joins name items by their words, so they follow a renamed item (when no other item has its old name).
    const was = this.doc[i].text.trim();
    if (was && !this.doc.some((it, n) => n !== i && it.text.trim() === was)) this.links = this.links.map((l) => ({ ...l, from: l.from === was ? text.trim() : l.from, to: l.to === was ? text.trim() : l.to }));
    this.commit(this.doc.map((it, n) => (n === i ? { ...it, text } : it)));
  }

  /* ---------- lines between items ---------- */

  private static next = (d: Dir = '-') => DIRS[(DIRS.indexOf(d) + 1) % DIRS.length];
  private turnLine(i: number) {
    const dir = ToOutline.next(this.doc[i].dir);
    this.commit(this.doc.map((it, n) => (n === i ? { ...it, dir: dir === '-' ? undefined : dir } : it)));
  }
  private nameLine(i: number, label: string) {
    this.naming = '';
    this.commit(this.doc.map((it, n) => (n === i ? { ...it, label: label.trim() || undefined } : it)));
  }
  private turnLink(k: number) {
    this.links = this.links.map((l, n) => (n === k ? { ...l, dir: ToOutline.next(l.dir) } : l));
    this.commit(this.doc);
  }
  private nameLink(k: number, label: string) {
    this.naming = '';
    this.links = this.links.map((l, n) => (n === k ? { ...l, label: label.trim() || undefined } : l));
    this.commit(this.doc);
  }
  private unlink(k: number) {
    this.links = this.links.filter((_, n) => n !== k);
    this.commit(this.doc);
  }
  /** Connect: start from the chosen item, or pick one first; everything else goes grey until the other end is tapped. */
  private connect() {
    this.connecting = this.connecting ? null : { from: this.sel >= 0 && this.doc[this.sel].text.trim() && !embedOf(this.doc[this.sel].text) ? this.sel : -1 };
  }
  private pick(i: number) {
    const c = this.connecting;
    if (!c) return;
    if (c.from < 0) return void (this.connecting = { from: i });
    const [from, to] = [this.doc[c.from].text.trim(), this.doc[i].text.trim()];
    this.connecting = null;
    if (from === to || this.links.some((l) => (l.from === from && l.to === to) || (l.from === to && l.to === from))) return;
    this.links = [...this.links, { from, to, dir: '-' }];
    this.commit(this.doc);
  }

  /** The bullet that is a line: what it is, said; tapped, it turns to the next kind. */
  private lineButton(dir: Dir, said: string, onTurn: () => void) {
    const glyph = dir === '>' ? UI.arrow : dir === '<' ? UI.arrowLeft : dir === '<>' ? UI.arrowBoth : null;
    return html`<button class="ol-kind" data-dir=${dir} aria-label=${`${said}: ${DIR_NAME[dir]}. Change it`} data-tip=${`${DIR_NAME[dir][0].toUpperCase()}${DIR_NAME[dir].slice(1)}: tap to change`} @mousedown=${(e: Event) => e.preventDefault()} @click=${onTurn}>${glyph ? icon(glyph, 14) : html`<span></span>`}</button>`;
  }
  /** The line's name: a plus to give it one, the name once it has one, a box while it is written. */
  private nameControl(key: string, label: string | undefined, said: string, onName: (v: string) => void) {
    if (this.naming === key) {
      return html`<input class="ol-label-input" aria-label=${`Name of ${said}`} .value=${label ?? ''} placeholder="Name the line"
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === 'Enter') (e.preventDefault(), onName((e.target as HTMLInputElement).value));
          else if (e.key === 'Escape') (e.preventDefault(), (this.naming = ''));
          e.stopPropagation();
        }}
        @blur=${(e: Event) => this.naming === key && onName((e.target as HTMLInputElement).value)} />`;
    }
    const open = () => {
      this.naming = key;
      void this.updateComplete.then(() => this.querySelector<HTMLInputElement>('.ol-label-input')?.focus());
    };
    return label
      ? html`<button class="ol-label" aria-label=${`${said} is named “${label}”. Rename it`} @click=${open}>${label}</button>`
      : html`<button class="ol-label-add" aria-label=${`Name ${said}`} data-tip="Name this line" @click=${open}>${icon(UI.plus, 12)}</button>`;
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

  /** The bar under the header, there however far the outline is scrolled: what to do with the chosen item. */
  private renderNav() {
    const s = this.sel;
    const none = s < 0 || s >= this.doc.length;
    const c = this.connecting;
    return html`<div class="to-toolbar ol-nav" role="toolbar" aria-label="Arrange and connect">
      <sl-button-group label="Arrange">
        ${tool('Bring out', 'outdent', () => this.shiftBy(s, -1), { disabled: none, keepFocus: true, key: 'Shift+Tab' })}${tool('Indent', 'indent', () => this.shiftBy(s, 1), { disabled: none, keepFocus: true, key: 'Tab' })}
        ${tool('Move up', 'up', () => this.moveBy(s, -1), { disabled: none, keepFocus: true, key: 'Alt+ArrowUp' })}${tool('Move down', 'down', () => this.moveBy(s, 1), { disabled: none, keepFocus: true, key: 'Alt+ArrowDown' })}
      </sl-button-group>
      ${tool('Zoom in', 'zoomIn', () => this.zoomTo(s), { disabled: none || !hasChildren(this.doc, s), keepFocus: true, key: 'Mod+.' })}
      ${tool(c ? 'Cancel connecting' : 'Connect', c ? 'close' : 'link', () => this.connect(), { text: true, pressed: !!c })}
      ${c ? html`<span class="to-hint ol-nav-hint" role="status">${c.from < 0 ? 'Tap the item to connect from.' : html`Tap the item to connect <b>${plainInline(this.doc[c.from].text)}</b> to.`}</span>` : nothing}
    </div>`;
  }

  /** The joins, under the outline: each with its kind of line, its name, and a way to take it away. */
  private renderLinks() {
    if (!this.links.length) return nothing;
    const known = new Set(this.doc.map((it) => it.text.trim()));
    return html`<section class="ol-links" aria-label="Connections">
      <h3>Connections</h3>
      ${this.links.map((l, k) => {
        if (!known.has(l.from) || !known.has(l.to)) return nothing;
        const said = `The connection from “${plainInline(l.from)}” to “${plainInline(l.to)}”`;
        return html`<div class="ol-link">
          <span class="ol-end">${plainInline(l.from)}</span>
          ${this.lineButton(l.dir, said, () => this.turnLink(k))}
          ${this.nameControl(`l${k}`, l.label, said.toLowerCase(), (v) => this.nameLink(k, v))}
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
    return html`
      <div class="to-toolbar" role="toolbar" aria-label="Outline">
        <sl-button-group label="Text">
          ${tool('Bold', 'bold', () => this.field?.exec('bold'))}${tool('Italic', 'italic', () => this.field?.exec('italic'))}${tool('Highlight', 'highlight', () => this.field?.highlight())}${tool('Link', 'link', () => void this.field?.link(), { key: 'Mod+K', keepFocus: true })}${tool('Icon in text', 'smile', () => this.field?.insertIcon())}
        </sl-button-group>
        <sl-button-group label="Folding">
          ${tool('Unfold all', 'down', () => this.foldAll(false), { text: true })}${tool('Fold all', 'right', () => this.foldAll(true), { text: true })}
        </sl-button-group>
        ${this.zoom >= 0 ? tool('Zoom out', 'left', () => this.zoomOut(), { text: true }) : nothing}
        <to-insert label="Insert" placeholder="Insert a document…" .options=${insertOptions('outline')} @pick=${(e: CustomEvent<string>) => this.insertDoc(e.detail)}></to-insert>
        <sl-dropdown hoist @sl-select=${(e: CustomEvent) => (location.hash = LINK + (e.detail.item.value === 'deck' ? makeRef('deck', outlineToDeck(items)) : outlineAs(e.detail.item.value, this.serialize(items))))}>
          <sl-button slot="trigger" size="small" caret>${icon(UI.mind, 14)} See as</sl-button>
          <sl-menu>
            <sl-menu-item value="deck">${icon(UI.deck, 14, 'pre')} Deck: a slide for every level</sl-menu-item>
            <sl-menu-item value="mind">${icon(UI.mind, 14, 'pre')} Mind map</sl-menu-item>
            <sl-menu-item value="org">${icon(UI.org, 14, 'pre')} Org chart</sl-menu-item>
            <sl-menu-item value="family">${icon(UI.family, 14, 'pre')} Family tree</sl-menu-item>
            <sl-menu-item value="net">${icon(UI.net ?? UI.mind, 14, 'pre')} Network: every line and join</sl-menu-item>
          </sl-menu>
        </sl-dropdown>
        <span class="to-spacer"></span>
        <span class="to-hint">${items.filter((it) => it.text.trim()).length} items</span>
      </div>
      ${this.renderNav()}
      ${this.crumbs()}
      <div class="ol ${this.connecting ? 'connecting' : ''}" role="tree" aria-label="Outline" @drop=${this.onDrop} @dragover=${(e: DragEvent) => this.drag && e.preventDefault()} @keydown=${(e: KeyboardEvent) => this.connecting && e.key === 'Escape' && (this.connecting = null)}>
        ${vis.map((i) => {
          const it = items[i];
          const kids = hasChildren(items, i);
          const shut = this.folded.has(i);
          const d = this.drag;
          return html`<div
            class="ol-row ${i === this.sel ? 'sel' : ''} ${d?.over === i ? `drop-${d.how}` : ''} ${this.connecting?.from === i ? 'source' : ''}"
            data-i=${i}
            role="treeitem"
            aria-level=${it.depth - base + 1}
            aria-expanded=${kids ? (shut ? 'false' : 'true') : nothing}
            style="--d:${it.depth - base}"
            @dragover=${(e: DragEvent) => this.onDragOver(e, i)}
            @keydown=${(e: KeyboardEvent) => this.onKey(e, i)}
          >
            <button class="ol-handle" draggable="true" aria-label="Move this item: drag it onto another" data-tip="Drag to move" @dragstart=${(e: DragEvent) => this.onDragStart(e, i)} @dragend=${() => ((this.drag = null), this.requestUpdate())} tabindex="-1">${icon(UI.grip, 14)}</button>
            ${kids
              ? html`<button class="ol-fold" aria-label=${shut ? `Unfold, ${blockEnd(items, i) - i - 1} inside` : 'Fold'} @click=${() => this.fold(i)}>${icon(shut ? UI.right : UI.down, 14)}</button>`
              : html`<span class="ol-fold" aria-hidden="true"></span>`}
            ${it.depth > 0 && parentOf(items, i) >= 0
              ? (() => {
                  const said = `the line from “${plainInline(items[parentOf(items, i)].text) || 'the item above'}” to item ${i + 1}`;
                  return html`${this.lineButton(it.dir ?? '-', said[0].toUpperCase() + said.slice(1), () => this.turnLine(i))}${this.nameControl(`i${i}`, it.label, said, (v) => this.nameLine(i, v))}`;
                })()
              : html`<span class="ol-kind root" aria-hidden="true"><span></span></span>`}
            ${embedOf(it.text)
              ? html`<to-embed class="ol-doc" ref=${embedOf(it.text)!} controls tabindex="0" @focusin=${() => (this.sel = i)} @embed-edit=${() => this.editDoc(i)} @embed-remove=${() => this.save(remove(items, i), Math.max(0, i - 1))}></to-embed>`
              : html`<to-rich mode="line" .tools=${false} label=${`Item ${i + 1}`} placeholder=${i === 0 && items.length === 1 ? 'Start with an idea; Enter for the next; Tab to put it under' : ''} .value=${it.text} @focusin=${(e: Event) => ((this.field = e.currentTarget as ToWrite), (this.sel = i))} @rich-change=${(e: CustomEvent<string>) => this.setText(i, e.detail)} @rich-enter=${() => this.enter(i)}></to-rich>`}
            ${kids && shut ? html`<span class="to-count ol-count" aria-hidden="true">${blockEnd(items, i) - i - 1}</span>` : nothing}
            ${this.connecting && it.text.trim() && !embedOf(it.text) && i !== this.connecting.from
              ? html`<button class="ol-pick" aria-label=${this.connecting.from < 0 ? `Connect from “${plainInline(it.text)}”` : `Connect “${plainInline(items[this.connecting.from].text)}” to “${plainInline(it.text)}”`} @click=${() => this.pick(i)}></button>`
              : nothing}
          </div>`;
        })}
        <button class="to-add ol-add" @click=${() => this.save([...items, { depth: base, text: '' }], items.length)}>${icon(UI.plus, 14)} Add an item</button>
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
