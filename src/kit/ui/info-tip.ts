/**
 * An info button and its tooltip (issue #61): ⓘ right after a label, its words in a popover anchored beside it. Shown
 * while a pointer rests on the button or it has the focus; a press (a tap, on a phone) keeps it open until a press
 * elsewhere or Escape (the popover's own light dismiss). The words are the button's description as well
 * (aria-describedby), so a screen reader says them as it lands on it, open or not.
 *
 * `id` names the tooltip, and its anchor; one per page, so each caller gives its own.
 */
import { html, type TemplateResult } from 'lit';
import { icon, UI } from '../draw/icons.ts';

/** The tooltip of a button: the popover it describes itself by. */
const tipOf = (btn: HTMLElement) => document.getElementById(btn.getAttribute('aria-describedby') ?? '');

/** Shown by a hover or the focus: marked so, and taken away again when they leave (a press keeps it). */
function peek(e: Event) {
  const tip = tipOf(e.currentTarget as HTMLElement);
  if (!tip || tip.matches(':popover-open')) return;
  tip.dataset.peek = '1';
  tip.showPopover();
}
function unpeek(e: Event) {
  const tip = tipOf(e.currentTarget as HTMLElement);
  if (tip?.dataset.peek && tip.matches(':popover-open')) tip.hidePopover();
}
/** A press: a tooltip shown by a hover or the focus stays; else the press opens or closes it. */
function press(e: Event) {
  const tip = tipOf(e.currentTarget as HTMLElement);
  if (!tip) return;
  if (tip.dataset.peek && tip.matches(':popover-open')) return void delete tip.dataset.peek;
  delete tip.dataset.peek;
  tip.togglePopover();
}
const hover = (e: PointerEvent) => e.pointerType === 'mouse' && peek(e);
const leave = (e: PointerEvent) => e.pointerType === 'mouse' && unpeek(e);

export const infoTip = (id: string, label: string, words: TemplateResult | string): TemplateResult =>
  html`<button type="button" class="to-btn to-tool to-tip-btn" style=${`anchor-name:--${id}`} aria-label=${label} aria-describedby=${id} @click=${press} @pointerenter=${hover} @pointerleave=${leave} @focus=${peek} @blur=${unpeek}>${icon(UI.info, 16)}</button><div id=${id} class="to-tip" role="tooltip" popover="auto" style=${`position-anchor:--${id}`} @toggle=${(e: ToggleEvent) => e.newState === 'closed' && delete (e.currentTarget as HTMLElement).dataset.peek}>${words}</div>`;

/**
 * A message's emphasis drawn: **strong** and _stressed_ (issue #61's copy leans on both), in Share's card and its tooltips. The marks are the
 * message's own, so each language puts them on its own words, or leaves them out.
 */
export const marked = (words: string): (string | TemplateResult)[] =>
  words
    .split(/(\*\*[^*]+\*\*|_[^_]+_)/)
    .map((part) => (part.startsWith('**') ? html`<strong>${part.slice(2, -2)}</strong>` : part.startsWith('_') && part.length > 2 ? html`<em>${part.slice(1, -1)}</em>` : part));
