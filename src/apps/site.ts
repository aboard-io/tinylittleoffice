/**
 * <to-site> and <to-links>: the page editor (diagram-page.ts) with a
 * theme menu in the bar, and Insert for another document on the page.
 */
import { defineElement, html, insertOptions, insertedRef, editRef, type SlSelect } from '../kit.ts';
import { PageView } from './diagram-page.ts';
import { readLines, writeLines } from '../lib/lines.ts';
import { FORM, THEMES, kindNamed, parseTheme } from '../lib/sitemodel.ts';
import { LINKS_FORM } from './links.def.ts';
import '../widgets/insert-box.ts';
import './site.css';

class SiteView extends PageView {
  /** The lines this page is made of. */
  protected get lines() {
    return (this.constructor as typeof SiteView).app === 'links' ? LINKS_FORM : FORM;
  }

  /** The theme row of the text, or none. */
  private theme(): string {
    const row = readLines(this.textOf(this.doc), this.lines).find((r) => this.lines[r.kind].name === 'Theme');
    return row ? row.values.join(' ') : '';
  }
  private setTheme(words: string) {
    const form = this.lines;
    const rows = readLines(this.textOf(this.doc), form).filter((r) => form[r.kind].name !== 'Theme');
    const t = parseTheme(words);
    const next = { kind: kindNamed(form, 'Theme'), values: [t.id, t.face ?? '', t.dark === undefined ? '' : t.dark ? 'dark' : 'light'], depth: 0 };
    this.type(writeLines([next, ...rows], form));
  }

  /** Another document on the page: a new one of the app chosen, at the end, made in its own editor. */
  private async insertDoc(what: string) {
    const form = this.lines;
    const kind = kindNamed(form, 'Document');
    if (kind < 0) return;
    const ref = insertedRef(what);
    const rows = readLines(this.textOf(this.doc), form);
    this.type(writeLines([...rows, { kind, values: [ref], depth: 0 }], form));
    if (what === 'qr-self') return;
    const made = await editRef(ref);
    const again = readLines(this.textOf(this.doc), form);
    this.type(writeLines(again.map((r) => (r.kind === kind && r.values[0] === ref ? { ...r, values: [made] } : r)), form));
  }

  protected tools() {
    const t = parseTheme(this.theme());
    const id = (this.constructor as typeof SiteView).app;
    return html`${kindNamed(this.lines, 'Document') >= 0 ? html`<to-insert label="Insert" .options=${insertOptions(id)} @pick=${(e: CustomEvent<string>) => void this.insertDoc(e.detail)}></to-insert>` : ''}
      <sl-select class="sr-label deck-theme" size="small" label="Theme" hoist .value=${t.id} @sl-change=${(e: Event) => this.setTheme(`${(e.target as SlSelect).value} ${t.dark === undefined ? '' : t.dark ? 'dark' : 'light'}`)}>
        ${Object.entries(THEMES).map(([key, T]) => html`<sl-option value=${key}><span slot="prefix" class="deck-theme-chip" style="--p:${T.dark ? T.tint : '#fff'};--i:${T.dark ? '#fafafa' : '#18181b'};--a:${T.a}" aria-hidden="true"></span>${T.name}</sl-option>`)}
      </sl-select>
      <sl-select class="sr-label site-mode" size="small" label="Light or dark" hoist .value=${t.dark === undefined ? 'auto' : t.dark ? 'dark' : 'light'} @sl-change=${(e: Event) => this.setTheme(`${t.id} ${(e.target as SlSelect).value === 'auto' ? '' : (e.target as SlSelect).value}`)}>
        <sl-option value="auto">As the theme is</sl-option>
        <sl-option value="light">Light</sl-option>
        <sl-option value="dark">Dark</sl-option>
      </sl-select>`;
  }
}
for (const id of ['site', 'links']) defineElement(id, class extends SiteView { static app = id; });
