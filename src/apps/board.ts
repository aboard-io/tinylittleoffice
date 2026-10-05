/**
 * <to-board>: a kanban board. The columns are the stages of a workflow; cards
 * move between them by drag and drop or with the arrows on each card.
 * Document format: see lib/boardmodel.ts.
 */
import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { icon, UI } from '../lib/icons.ts';
import { MAX_STAGES, parseBoard, serializeBoard, type Stage } from '../lib/boardmodel.ts';

@customElement('to-board')
export class ToBoard extends LitElement {
  @property() value = '';
  @state() private stages: Stage[] = parseBoard('');
  /** The card being dragged: [stage, card]. */
  @state() private drag: [number, number] | null = null;
  @state() private over = -1;
  private lastEmitted = '';

  createRenderRoot() {
    return this;
  }

  willUpdate(changed: PropertyValues) {
    if (changed.has('value') && this.value !== this.lastEmitted) {
      this.stages = parseBoard(this.value);
      this.lastEmitted = this.value;
    }
  }

  private commit(stages: Stage[]) {
    this.stages = stages;
    this.lastEmitted = serializeBoard(stages);
    this.dispatchEvent(new CustomEvent('docchange', { detail: this.lastEmitted, bubbles: true, composed: true }));
  }

  private patchStage(i: number, p: Partial<Stage>) {
    this.commit(this.stages.map((s, j) => (j === i ? { ...s, ...p } : s)));
  }

  private addStage() {
    if (this.stages.length >= MAX_STAGES) return;
    this.commit([...this.stages, { name: 'New stage', limit: 0, cards: [] }]);
    this.updateComplete.then(() => {
      const el = this.querySelector<HTMLInputElement>('.board-col:last-of-type input.name');
      el?.focus();
      el?.select();
    });
  }

  private moveStage(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= this.stages.length) return;
    const stages = [...this.stages];
    [stages[i], stages[j]] = [stages[j], stages[i]];
    this.commit(stages);
  }

  private removeStage(i: number) {
    const s = this.stages[i];
    if (s.cards.length && !confirm(`Delete "${s.name}" and its ${s.cards.length} cards?`)) return;
    this.commit(this.stages.filter((_, j) => j !== i));
  }

  private addCard(i: number, input: HTMLInputElement) {
    const text = input.value.trim();
    if (!text) return;
    this.patchStage(i, { cards: [...this.stages[i].cards, text] });
    input.value = '';
  }

  /** Move a card to the end of another stage (or to `at` within it). */
  private moveCard(from: number, card: number, to: number, at = -1) {
    if (to < 0 || to >= this.stages.length) return;
    const stages = this.stages.map((s) => ({ ...s, cards: [...s.cards] }));
    const [text] = stages[from].cards.splice(card, 1);
    stages[to].cards.splice(at < 0 ? stages[to].cards.length : at, 0, text);
    this.commit(stages);
  }

  /** Alt+arrows carry a card along the workflow, or up and down its stage; the card keeps the focus. */
  private onCardKey(e: KeyboardEvent, i: number, c: number) {
    if (!e.altKey || !e.key.startsWith('Arrow')) return;
    e.preventDefault();
    const n = this.stages[i].cards.length;
    let [to, at] = [i, c];
    if (e.key === 'ArrowLeft') to = i - 1;
    else if (e.key === 'ArrowRight') to = i + 1;
    else at = c + (e.key === 'ArrowUp' ? -1 : 1);
    if (to < 0 || to >= this.stages.length || (to === i && (at < 0 || at >= n))) return;
    if (to !== i) at = this.stages[to].cards.length;
    this.moveCard(i, c, to, at);
    this.updateComplete.then(() => this.querySelector<HTMLElement>(`.board-col:nth-of-type(${to + 1}) .board-card:nth-child(${at + 1}) textarea`)?.focus());
  }

  private editCard(i: number, c: number, text: string) {
    this.patchStage(i, { cards: this.stages[i].cards.map((t, k) => (k === c ? text : t)) });
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
    if (from === to && (at === card || (at < 0 && card === this.stages[to].cards.length - 1))) return;
    this.moveCard(from, card, to, at);
  }

  render() {
    const n = this.stages.length;
    return html`
      <div class="to-toolbar">
        <sl-button size="small" ?disabled=${n >= MAX_STAGES} @click=${this.addStage}>${icon(UI.plus, 14)} Stage</sl-button>
        <span class="to-spacer"></span>
        <span class="to-hint">${this.stages.reduce((a, s) => a + s.cards.length, 0)} cards</span>
      </div>
      <div class="board">
        ${this.stages.map((s, i) => {
          const full = s.limit > 0 && s.cards.length > s.limit;
          return html`<section
            class="board-col ${this.over === i ? 'over' : ''} ${full ? 'full' : ''}"
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
              <span class="count" title=${full ? 'Over the limit' : ''}>${s.cards.length}${s.limit ? ` / ${s.limit}` : ''}</span>
              <sl-dropdown hoist placement="bottom-end">
                <button slot="trigger" class="more" aria-label="Stage options: ${s.name}">${icon(UI.more, 16)}</button>
                <sl-menu
                  @sl-select=${(e: CustomEvent) => {
                    const v = e.detail.item.value as string;
                    if (v === 'left') this.moveStage(i, -1);
                    else if (v === 'right') this.moveStage(i, 1);
                    else if (v === 'delete') this.removeStage(i);
                    else this.patchStage(i, { limit: parseInt(v, 10) });
                  }}
                >
                  <sl-menu-item value="left" ?disabled=${i === 0}>Move left</sl-menu-item>
                  <sl-menu-item value="right" ?disabled=${i === n - 1}>Move right</sl-menu-item>
                  <sl-divider></sl-divider>
                  <sl-menu-label>Limit</sl-menu-label>
                  ${[0, 1, 2, 3, 5, 8].map((l) => html`<sl-menu-item type="checkbox" value=${l} ?checked=${s.limit === l}>${l || 'None'}</sl-menu-item>`)}
                  <sl-divider></sl-divider>
                  <sl-menu-item value="delete" ?disabled=${n <= 1}>Delete stage</sl-menu-item>
                </sl-menu>
              </sl-dropdown>
            </header>
            <ul>
              ${s.cards.map(
                (text, c) => html`<li
                  class="board-card ${this.drag && this.drag[0] === i && this.drag[1] === c ? 'dragging' : ''}"
                  data-idx=${c}
                  draggable="true"
                  @dragstart=${(e: DragEvent) => {
                    this.drag = [i, c];
                    e.dataTransfer?.setData('text/plain', text);
                    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
                  }}
                  @keydown=${(e: KeyboardEvent) => this.onCardKey(e, i, c)}
                  @dragend=${() => {
                    this.drag = null;
                    this.over = -1;
                  }}
                >
                  <textarea rows="1" aria-label="Card" .value=${text} @input=${(e: Event) => this.editCard(i, c, (e.target as HTMLTextAreaElement).value.replace(/\n/g, ' '))}></textarea>
                  <div class="acts">
                    <button aria-label="Move to previous stage" ?disabled=${i === 0} @click=${() => this.moveCard(i, c, i - 1)}>${icon(UI.left, 14)}</button>
                    <button aria-label="Move to next stage" ?disabled=${i === n - 1} @click=${() => this.moveCard(i, c, i + 1)}>${icon(UI.right, 14)}</button>
                    <span class="to-spacer"></span>
                    <button aria-label="Delete card" @click=${() => this.patchStage(i, { cards: s.cards.filter((_, k) => k !== c) })}>${icon(UI.close, 14)}</button>
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
