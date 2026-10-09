/**
 * <to-board>: a kanban board. The columns are the stages of a workflow,
 * each in a colour of its own if it likes; cards (a line of rich text,
 * and a checklist under it if it has one) move between them by drag and
 * drop or with the arrows on each card. Document format: lib/boardmodel.ts.
 */
import { goLinks } from '../widgets/link-guard.ts';
import { DocElement, defineElement, html, nothing, state, btn, tool, icon, swap, UI } from '../kit.ts';
import { MAX_STAGES, STAGE_COLORS, card, parseBoard, progress, serializeBoard, type Card, type Stage } from '../lib/boardmodel.ts';
import { plainInline, webRef } from '../lib/richtext.ts';
import { embedOf } from '../lib/embeds.ts';
import './write.ts';
import type { ToWrite } from './write.ts';

export class ToBoard extends DocElement<Stage[]> {
  /** The card being dragged: [stage, card]. */
  @state() private drag: [number, number] | null = null;
  @state() private over = -1;
  /** The card's text last typed in: what the text buttons work on. */
  private field: ToWrite | null = null;

  protected parse = parseBoard;
  protected serialize = serializeBoard;

  private patchStage(i: number, p: Partial<Stage>) {
    this.commit(this.doc.map((s, j) => (j === i ? { ...s, ...p } : s)));
  }

  private addStage() {
    if (this.doc.length >= MAX_STAGES) return;
    this.commit([...this.doc, { name: 'New stage', limit: 0, color: '', cards: [] }]);
    this.focusSoon('.board-col:last-of-type input.name', true);
  }

  private moveStage(i: number, d: number) {
    const stages = swap(this.doc, i, i + d);
    if (stages !== this.doc) this.commit(stages);
  }

  private removeStage(i: number) {
    const s = this.doc[i];
    if (s.cards.length && !confirm(`Delete "${s.name}" and its ${s.cards.length} cards?`)) return;
    this.commit(this.doc.filter((_, j) => j !== i));
  }

  private addCard(i: number, input: HTMLInputElement) {
    const text = input.value.trim();
    if (!text) return;
    this.patchStage(i, { cards: [...this.doc[i].cards, card(text)] });
    input.value = '';
  }

  /** Move a card to the end of another stage (or to `at` within it). */
  private moveCard(from: number, card: number, to: number, at = -1) {
    if (to < 0 || to >= this.doc.length) return;
    const stages = this.doc.map((s) => ({ ...s, cards: [...s.cards] }));
    const [moved] = stages[from].cards.splice(card, 1);
    stages[to].cards.splice(at < 0 ? stages[to].cards.length : at, 0, moved);
    this.commit(stages);
  }

  /** Alt+arrows carry a card along the workflow, or up and down its stage; the card keeps the focus. */
  private onCardKey(e: KeyboardEvent, i: number, c: number) {
    if (!e.altKey || !e.key.startsWith('Arrow')) return;
    e.preventDefault();
    const n = this.doc[i].cards.length;
    let [to, at] = [i, c];
    if (e.key === 'ArrowLeft') to = i - 1;
    else if (e.key === 'ArrowRight') to = i + 1;
    else at = c + (e.key === 'ArrowUp' ? -1 : 1);
    if (to < 0 || to >= this.doc.length || (to === i && (at < 0 || at >= n))) return;
    if (to !== i) at = this.doc[to].cards.length;
    this.moveCard(i, c, to, at);
    this.focusSoon(`.board-col:nth-of-type(${to + 1}) .board-card:nth-child(${at + 1}) .write-page`);
  }

  private patchCard(i: number, c: number, p: Partial<Card>) {
    this.patchStage(i, { cards: this.doc[i].cards.map((t, k) => (k === c ? { ...t, ...p } : t)) });
  }
  /** The checklist: an item changed, ticked, or taken away (text null); Enter in one starts the next. */
  private patchItem(i: number, c: number, k: number, p: { text?: string | null; done?: boolean }) {
    const items = [...this.doc[i].cards[c].items];
    if (p.text === null) items.splice(k, 1);
    else items[k] = { ...items[k], ...(p.text !== undefined ? { text: p.text } : {}), ...(p.done !== undefined ? { done: p.done } : {}) };
    this.patchCard(i, c, { items });
  }
  private addItem(i: number, c: number, after = this.doc[i].cards[c].items.length - 1) {
    const items = [...this.doc[i].cards[c].items];
    items.splice(after + 1, 0, { text: '', done: false });
    this.patchCard(i, c, { items });
    this.focusSoon(`.board-col:nth-of-type(${i + 1}) .board-card:nth-child(${c + 1}) .board-items li:nth-child(${after + 2}) input[type="text"]`);
  }

  private onDrop(e: DragEvent, to: number) {
    e.preventDefault();
    this.over = -1;
    if (!this.drag) return;
    const [from, card] = this.drag;
    this.drag = null;
    // Drop on a card to go before it, anywhere else in the column to go last.
    const target = (e.target as HTMLElement).closest<HTMLElement>('.board-card');
    let at = target ? Number(target.dataset.idx) : -1;
    if (from === to && at > card) at--;
    if (from === to && (at === card || (at < 0 && card === this.doc[to].cards.length - 1))) return;
    this.moveCard(from, card, to, at);
  }

  render() {
    const n = this.doc.length;
    return html`
      <div class="to-toolbar" role="toolbar" aria-label="Board">
        <sl-button size="small" ?disabled=${n >= MAX_STAGES} @click=${this.addStage}>${icon(UI.plus, 14)} Stage</sl-button>
        <sl-button-group label="Text">
          ${tool('Bold', 'bold', () => this.field?.exec('bold'), { key: 'Mod+B' })}${tool('Italic', 'italic', () => this.field?.exec('italic'), { key: 'Mod+I' })}${tool('Underline', 'underline', () => this.field?.exec('underline'), { key: 'Mod+U' })}${tool('Strikethrough', 'strike', () => this.field?.exec('strikeThrough'))}${tool('Highlight', 'highlight', () => this.field?.highlight())}${tool('Link', 'link', () => void this.field?.link(), { key: 'Mod+K', keepFocus: true })}${tool('Icon in text', 'smile', () => void this.field?.insertIcon())}
        </sl-button-group>
        <span class="to-spacer"></span>
        <span class="to-hint">${this.doc.reduce((a, s) => a + s.cards.length, 0)} cards</span>
      </div>
      <div class="board">
        ${this.doc.map((s, i) => {
          const full = s.limit > 0 && s.cards.length > s.limit;
          return html`<section
            class="board-col ${this.over === i ? 'over' : ''} ${full ? 'full' : ''} ${s.color ? 'tinted' : ''}"
            style=${s.color ? `--c:${STAGE_COLORS[s.color].hex}` : nothing}
            aria-label=${s.name}
            @dragover=${(e: DragEvent) => {
              e.preventDefault();
              this.over = i;
            }}
            @dragleave=${() => (this.over = -1)}
            @drop=${(e: DragEvent) => this.onDrop(e, i)}
          >
            <header>
              <input class="name" aria-label="Stage name" .value=${s.name} @input=${(e: Event) => this.patchStage(i, { name: (e.target as HTMLInputElement).value })} />
              <span class="to-count count" data-tip=${full ? 'Over the limit' : ''}>${s.cards.length}${s.limit ? ` / ${s.limit}` : ''}</span>
              <sl-dropdown hoist placement="bottom-end">
                <button slot="trigger" class="more" aria-label="Stage options: ${s.name}">${icon(UI.more, 16)}</button>
                <sl-menu
                  @sl-select=${(e: CustomEvent) => {
                    const v = e.detail.item.value as string;
                    if (v === 'left') this.moveStage(i, -1);
                    else if (v === 'right') this.moveStage(i, 1);
                    else if (v === 'delete') this.removeStage(i);
                    else if (v.startsWith('color:')) this.patchStage(i, { color: v.slice(6) });
                    else this.patchStage(i, { limit: parseInt(v, 10) });
                  }}
                >
                  <sl-menu-item value="left" ?disabled=${i === 0}>Move left</sl-menu-item>
                  <sl-menu-item value="right" ?disabled=${i === n - 1}>Move right</sl-menu-item>
                  <sl-divider></sl-divider>
                  <sl-menu-label>Limit</sl-menu-label>
                  ${[0, 1, 2, 3, 5, 8].map((l) => html`<sl-menu-item type="checkbox" value=${l} ?checked=${s.limit === l}>${l || 'None'}</sl-menu-item>`)}
                  <sl-divider></sl-divider>
                  <sl-menu-label>Colour</sl-menu-label>
                  <sl-menu-item type="checkbox" value="color:" ?checked=${!s.color}>None</sl-menu-item>
                  ${Object.entries(STAGE_COLORS).map(([k, c]) => html`<sl-menu-item type="checkbox" value=${`color:${k}`} ?checked=${s.color === k}><i class="board-dot" style="--c:${c.hex}"></i>${c.name}</sl-menu-item>`)}
                  <sl-divider></sl-divider>
                  <sl-menu-item value="delete" ?disabled=${n <= 1}>Delete stage</sl-menu-item>
                </sl-menu>
              </sl-dropdown>
            </header>
            <ul>
              ${s.cards.map(
                (cd, c) => html`<li
                  class="board-card ${this.drag && this.drag[0] === i && this.drag[1] === c ? 'dragging' : ''}"
                  data-idx=${c}
                  draggable="true"
                  @dragstart=${(e: DragEvent) => {
                    this.drag = [i, c];
                    e.dataTransfer?.setData('text/plain', plainInline(cd.text));
                    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
                  }}
                  @keydown=${(e: KeyboardEvent) => this.onCardKey(e, i, c)}
                  @dragend=${() => {
                    this.drag = null;
                    this.over = -1;
                  }}
                >
                  <to-rich mode="line" .tools=${false} label="Card" placeholder="Card" .value=${cd.text} @focusin=${(e: Event) => (this.field = e.currentTarget as ToWrite)} @rich-change=${(e: CustomEvent<string>) => this.patchCard(i, c, { text: e.detail })}></to-rich>${embedOf(plainInline(cd.text)) ? html`<to-embed class="board-web" ref=${webRef(plainInline(cd.text))}></to-embed>` : goLinks(plainInline(cd.text))}
                  ${cd.items.length
                    ? html`<ul class="board-items" aria-label="Checklist">
                        ${cd.items.map(
                          (it, k) => html`<li class=${it.done ? 'done' : ''}>
                            <input type="checkbox" aria-label=${`Done: ${it.text || 'item'}`} .checked=${it.done} @change=${(e: Event) => this.patchItem(i, c, k, { done: (e.target as HTMLInputElement).checked })} />
                            <input type="text" aria-label=${`Checklist item ${k + 1}`} placeholder="To do" .value=${it.text} @input=${(e: Event) => this.patchItem(i, c, k, { text: (e.target as HTMLInputElement).value })} @keydown=${(e: KeyboardEvent) => {
                              if (e.key === 'Enter') (e.preventDefault(), this.addItem(i, c, k));
                              else if (e.key === 'Backspace' && !(e.target as HTMLInputElement).value) (e.preventDefault(), this.patchItem(i, c, k, { text: null }));
                            }} />
                          </li>`,
                        )}
                      </ul>`
                    : nothing}
                  <div class="acts">
                    ${btn('Move to previous stage', 'left', () => this.moveCard(i, c, i - 1), { disabled: i === 0 })}
                    ${btn('Move to next stage', 'right', () => this.moveCard(i, c, i + 1), { disabled: i === n - 1 })}
                    ${btn(cd.items.length ? 'Another checklist item' : 'Add a checklist', 'box', () => this.addItem(i, c))}
                    ${cd.items.length ? html`<span class="board-progress">${progress(cd)}</span>` : nothing}
                    <span class="to-spacer"></span>
                    ${btn('Delete card', 'close', () => this.patchStage(i, { cards: s.cards.filter((_, k) => k !== c) }))}
                  </div>
                </li>`,
              )}
            </ul>
            <input
              class="add"
              placeholder="Add a card"
              aria-label="Add a card to ${s.name}"
              @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.addCard(i, e.target as HTMLInputElement)}
              @blur=${(e: Event) => this.addCard(i, e.target as HTMLInputElement)}
            />
          </section>`;
        })}
        ${n ? nothing : html`<p class="to-empty">No stages.</p>`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-board': ToBoard;
  }
}
defineElement('board', ToBoard);
