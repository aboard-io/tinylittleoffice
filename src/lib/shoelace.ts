/**
 * The Shoelace components TinyLittleOffice uses, imported one by one so the bundle
 * only carries what the pages render. Theme tokens live in src/styles.css.
 */
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/button-group/button-group.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
import '@shoelace-style/shoelace/dist/components/radio-button/radio-button.js';
import '@shoelace-style/shoelace/dist/components/copy-button/copy-button.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';
import '@shoelace-style/shoelace/dist/components/drawer/drawer.js';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/components/menu-label/menu-label.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/progress-ring/progress-ring.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/switch/switch.js';
import '@shoelace-style/shoelace/dist/components/tag/tag.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import Popup from '@shoelace-style/shoelace/dist/components/popup/popup.js';

export type { default as SlInput } from '@shoelace-style/shoelace/dist/components/input/input.js';
export type { default as SlSelect } from '@shoelace-style/shoelace/dist/components/select/select.js';
export type { default as SlCheckbox } from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
export type { default as SlTextarea } from '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
export type { default as SlDialog } from '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
export type { default as SlSwitch } from '@shoelace-style/shoelace/dist/components/switch/switch.js';
export type { default as SlDrawer } from '@shoelace-style/shoelace/dist/components/drawer/drawer.js';

/**
 * A hoisted menu (a select's list, a dropdown) opens in the top layer, over
 * everything: iOS Safari otherwise clips it to a toolbar that scrolls
 * sideways, though it is placed against the window.
 */
if (typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype) {
  type Self = HTMLElement & { popup: HTMLElement; strategy: string; active: boolean };
  // (start and stop are the popup's own, private: reached round the type.)
  const proto = Popup.prototype as unknown as { start(this: Self): void; stop(this: Self): Promise<void> };
  const { start, stop } = proto;
  proto.start = function (this: Self) {
    const p = this.popup;
    if (this.active && this.strategy === 'fixed' && p && !p.matches(':popover-open')) {
      p.popover = 'manual';
      // The top layer's own defaults (centred, a border, a background) give way to the popup's.
      Object.assign(p.style, { inset: 'auto', margin: '0', padding: '0', border: '0', background: 'transparent', overflow: 'visible', color: 'inherit' });
      p.showPopover();
    }
    start.call(this);
  };
  proto.stop = function (this: Self) {
    if (this.popup?.matches(':popover-open')) this.popup.hidePopover();
    return stop.call(this);
  };
}
