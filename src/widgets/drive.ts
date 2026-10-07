/**
 * <to-drive>: the documents saved on this device, as a drive. Folders (and
 * folders in folders) down the left; the documents in the one chosen on
 * the right, or everything, or whatever a search finds, in titles and in
 * the words of the documents themselves. Move, rename, make and drop
 * folders; and one red button that blows it all away. Nothing here is on
 * any server: a document is still its link, and this is only a list of them.
 */
import { LitElement, html, nothing } from 'lit';
import { appOf } from '../kit/core.ts';
import { cleanFolder, dropFolder, folderTree, forget, forgetAll, library, moveTo, renameFolder, saving, type Kept } from '../lib/library.ts';
import { decodeEnvelope } from '../lib/envelope.ts';
import { icon, UI } from '../lib/icons.ts';

const fmt = (ms: number) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(ms);

export class ToDrive extends LitElement {
  static properties = { folder: {}, q: { state: true }, drag: { state: true }, tick: { state: true } };
  /** The folder open; '' for everything. */
  declare folder: string;
  declare q: string;
  /** A document being dragged onto a folder. */
  declare drag: string | null;
  declare tick: number;
  constructor() {
    super();
    this.folder = '';
    this.q = '';
    this.drag = null;
    this.tick = 0;
  }
  protected createRenderRoot() {
    return this;
  }
  private refresh() {
    this.tick++;
    this.dispatchEvent(new CustomEvent('drive-change', { bubbles: true }));
  }

  /** The words of a document, for searching: its title, app, folder and outline. */
  private words = new Map<string, string>();
  private wordsOf(k: Kept): string {
    const key = k.id + k.hash;
    let w = this.words.get(key);
    if (w === undefined) {
      const def = appOf(k.app);
      let body = '';
      try {
        body = decodeEnvelope(k.hash.replace(/^#\/v\d+\/[a-z0-9-]+\//, '').replace(/^#\/[a-z0-9-]+\//, ''), k.app).body;
      } catch {
        // (Sealed, or not ours to read.)
      }
      w = [k.title, def?.name ?? k.app, k.folder, ...(def && body ? def.outline(body) : [])].join('\n').toLowerCase();
      this.words.set(key, w);
    }
    return w;
  }

  private shown(all: Kept[]): Kept[] {
    const q = this.q.trim().toLowerCase();
    if (q) return all.filter((k) => this.wordsOf(k).includes(q)).sort((a, b) => b.at - a.at);
    return all.filter((k) => !this.folder || k.folder === this.folder || k.folder.startsWith(this.folder + '/')).sort((a, b) => b.at - a.at);
  }

  private open(folder: string) {
    this.folder = folder;
    this.q = '';
    location.hash = folder ? `#/drive/${encodeURIComponent(folder)}` : '#/drive';
  }
  private newFolder() {
    const name = prompt('New folder', this.folder ? this.folder + '/' : '');
    if (!name) return;
    // A folder exists once something is in it; so the first document moved there makes it. Until then, open it.
    this.open(cleanFolder(name));
  }
  private rename(folder: string) {
    const to = prompt('Rename the folder', folder);
    if (to === null || cleanFolder(to) === folder) return;
    renameFolder(folder, to);
    if (this.folder === folder || this.folder.startsWith(folder + '/')) this.open(cleanFolder(to) + this.folder.slice(folder.length));
    this.refresh();
  }
  private drop(folder: string, n: number) {
    if (!confirm(`Remove the folder “${folder}” and the ${n} document${n === 1 ? '' : 's'} in it from this device? Any you have the link for can be opened again.`)) return;
    dropFolder(folder);
    if (this.folder === folder || this.folder.startsWith(folder + '/')) this.open('');
    this.refresh();
  }
  private move(k: Kept) {
    const to = prompt(`Folder for “${k.title}”`, k.folder);
    if (to === null) return;
    moveTo(k.id, to);
    this.refresh();
  }
  private blowAway() {
    if (!confirm('Erase every document saved on this device? Any you have the link for can be opened again. Your settings stay.')) return;
    forgetAll();
    this.open('');
    this.refresh();
  }

  render() {
    const all = library();
    const tree = folderTree(all);
    const docs = this.shown(all);
    const count = (f: string) => all.filter((k) => k.folder === f || k.folder.startsWith(f + '/')).length;
    const here = this.folder && !tree.includes(this.folder) ? [...tree, this.folder].sort() : tree;
    return html`<section class="drive">
      <aside class="drive-nav" aria-label="Folders">
        <input class="drive-find" type="search" placeholder="Search your documents" aria-label="Search your documents" .value=${this.q} @input=${(e: Event) => (this.q = (e.target as HTMLInputElement).value)} />
        <nav>
          <a href="#/drive" class=${!this.folder && !this.q ? 'on' : ''} aria-current=${!this.folder && !this.q ? 'page' : nothing} @click=${(e: Event) => (e.preventDefault(), this.open(''))}>${icon(UI.home, 16)}<span class="name">Everything</span><small>${all.length}</small></a>
          ${here.map((f) => {
            const depth = f.split('/').length - 1;
            const name = f.split('/').pop()!;
            return html`<a
              href="#/drive/${encodeURIComponent(f)}"
              class="${f === this.folder && !this.q ? 'on' : ''} ${this.drag ? 'droppable' : ''}"
              style="--d:${depth}"
              aria-current=${f === this.folder && !this.q ? 'page' : nothing}
              @click=${(e: Event) => (e.preventDefault(), this.open(f))}
              @dragover=${(e: DragEvent) => this.drag && (e.preventDefault(), (e.currentTarget as HTMLElement).classList.add('over'))}
              @dragleave=${(e: DragEvent) => (e.currentTarget as HTMLElement).classList.remove('over')}
              @drop=${(e: DragEvent) => { e.preventDefault(); if (this.drag) moveTo(this.drag, f); this.drag = null; this.refresh(); }}
              >${icon(UI.folder, 16)}<span class="name">${name}</span><small>${count(f)}</small>
              <span class="drive-folder-acts">
                <button aria-label="Rename ${f}" title="Rename" @click=${(e: Event) => (e.preventDefault(), e.stopPropagation(), this.rename(f))}>${icon(UI.pen, 13)}</button>
                <button aria-label="Remove ${f} and what is in it" title="Remove" @click=${(e: Event) => (e.preventDefault(), e.stopPropagation(), this.drop(f, count(f)))}>${icon(UI.trash, 13)}</button>
              </span></a>`;
          })}
        </nav>
        <button class="drive-new" @click=${this.newFolder}>${icon(UI.plus, 14)} New folder</button>
        <div class="drive-foot">
          <button class="drive-zip" @click=${() => this.dispatchEvent(new CustomEvent('drive-zip', { bubbles: true }))}>${icon(UI.download, 14)} Download everything (.zip)</button>
          <button class="drive-nuke" @click=${this.blowAway} ?disabled=${!all.length}>${icon(UI.trash, 14)} Blow it all away</button>
        </div>
      </aside>
      <div class="drive-main">
        <h1>${this.q.trim() ? html`${docs.length} found for “${this.q.trim()}”` : this.folder ? html`${icon(UI.folder, 20)} ${this.folder}` : 'Everything'}</h1>
        ${!saving()
          ? html`<p class="to-empty">Private: nothing is saved on this device. Press the switch in the header to save your documents here, in folders.</p>`
          : !docs.length
            ? html`<p class="to-empty">${this.q.trim() ? 'Nothing here says that.' : this.folder ? 'An empty folder. Drag a document onto it, or move one here.' : 'Nothing saved yet. Every document you make or open is kept here, in a folder named for its app, until you say otherwise.'}</p>`
            : html`<ul class="drive-list">
                ${docs.map((k) => {
                  const def = appOf(k.app);
                  return html`<li draggable="true" @dragstart=${(e: DragEvent) => { this.drag = k.id; e.dataTransfer?.setData('text/plain', k.title); }} @dragend=${() => (this.drag = null)}>
                    <a href=${k.hash}>${icon(UI[(def?.icon ?? 'write') as keyof typeof UI], 18)}<b>${k.title || `Untitled ${def?.name ?? k.app}`}</b><span class="meta">${def?.name ?? k.app}${!this.folder || this.q ? html` · ${k.folder}` : nothing} · ${fmt(k.at)}</span></a>
                    <button aria-label="Move ${k.title} to another folder" title="Move to a folder" @click=${() => this.move(k)}>${icon(UI.folder, 15)}</button>
                    <button aria-label="Remove ${k.title} from this device" title="Remove from this device" @click=${() => { forget(k.id); this.refresh(); }}>${icon(UI.trash, 15)}</button>
                  </li>`;
                })}
              </ul>`}
        <p class="to-hint">Saved only on this device, in this browser: not on any server, not on your other devices. A link is the whole document, and the only way to carry one across.</p>
      </div>
    </section>`;
  }
}
if (!customElements.get('to-drive')) customElements.define('to-drive', ToDrive);
