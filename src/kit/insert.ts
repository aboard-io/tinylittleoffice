/**
 * <to-insert>: the Insert ▾ menu every bar has, a <to-menu> with that name and a plus. The app gives it
 * the things that can be put in (a heading, a table, another document…), each an item. Typing
 * narrows the list (menu.ts `filter`).
 */
import { ToMenu } from './menu.ts';
import { UI } from './icons.ts';
import { t } from './i18n.ts';

export class ToInsert extends ToMenu {
  constructor() {
    super();
    this.icon = UI.plus;
    this.caret = true;
    // Letters typed narrow the list: "ta" to Table, "qr" to the QR code.
    this.filter = true;
  }
  protected labelText(): string {
    return this.label || t('Insert');
  }
}
customElements.define('to-insert', ToInsert);
