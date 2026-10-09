/**
 * <to-insert>: the Insert ▾ menu every bar has, a <to-menu> with that name and a plus. The app gives it
 * the things that can be put in (a heading, a table, a picture, another document…), each an item.
 */
import { ToMenu } from './menu.ts';
import { UI } from './icons.ts';
import { t } from './i18n.ts';

export class ToInsert extends ToMenu {
  constructor() {
    super();
    this.icon = UI.plus;
    this.caret = true;
  }
  protected labelText(): string {
    return this.label || t('Insert');
  }
}
customElements.define('to-insert', ToInsert);
