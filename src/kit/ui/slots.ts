/**
 * Slots for an element drawn in the light DOM, as the kit's are (its stylesheet reaches them, a page's own rules do
 * too): a child the page gives with `slot="<name>"` is taken out as the element first draws, and put where the
 * element's template names that slot (`${this.slots.get('actions')}`), moved there, never copied, so its listeners
 * and its state go with it. A child given later with a `slot` joins its slot at once. A child with no `slot` is left
 * where the page put it. <to-table>'s toolbar and <to-header>'s actions and search are slots so.
 *
 *   class ToThing extends LitElement {
 *     private slots = new Slots(this);
 *     createRenderRoot() { this.slots.take(); return this; }
 *     render() { return html`<div class="bar">${this.slots.get('toolbar')}</div>`; }
 *   }
 */
import type { ReactiveControllerHost } from 'lit';

export class Slots {
  private held = new Map<string, Element[]>();
  private watch: MutationObserver | null = null;
  constructor(private host: HTMLElement & ReactiveControllerHost) {}

  /**
   * The host's children with a `slot`, taken out before the first draw (from createRenderRoot, so Lit's own place in the
   * host is not beside a child that is about to move), and those added later, as they come.
   */
  take(): void {
    this.gather();
    this.watch ??= new MutationObserver(() => this.gather() && this.host.requestUpdate());
    this.watch.observe(this.host, { childList: true });
  }

  /** The children given for a slot, in their order: what a template draws where the slot is. */
  get(name: string): Element[] {
    return this.held.get(name) ?? [];
  }

  /** Whether the page gave anything for a slot. */
  has(name: string): boolean {
    return this.get(name).length > 0;
  }

  /** The host's own children with a `slot` taken into their slots; true when there were any. */
  private gather(): boolean {
    const come = [...this.host.children].filter((el) => el.hasAttribute('slot'));
    for (const el of come) {
      const name = el.getAttribute('slot')!;
      el.remove();
      this.held.set(name, [...this.get(name).filter((x) => x !== el), el]);
    }
    return come.length > 0;
  }
}
