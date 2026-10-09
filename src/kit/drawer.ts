/**
 * <to-drawer>: the menu behind the hamburger, a native <dialog> that slides in from the side. Find an
 * app; Private or Saved; Keep the app on this device; Language; Theme; About.
 */
import { LitElement, html, nothing } from 'lit';
import { apps } from './apps.ts';
import { icon, UI } from './icons.ts';
import { routeHash } from './route.ts';
import { chosenLanguage, languageName, languages, onLanguage, setLanguage, t } from './i18n.ts';
import { THEMES, setTheme, theme, themeName, type Theme } from './theme.ts';
import { keeping, onPrivacy, setPrivate } from './privacy.ts';
import { offlineState, onOffline, setOffline } from './offline.ts';
import { toast } from './toast.ts';
import type { ToDialog } from './dialog.ts';
import './dialog.ts';

export class ToDrawer extends LitElement {
  static properties = { find: { state: true }, open: { state: true } };
  declare find: string;
  declare open: boolean;
  private offs: (() => void)[] = [];

  constructor() {
    super();
    this.find = '';
    this.open = false;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    const redraw = () => this.requestUpdate();
    this.offs = [onLanguage(redraw), onPrivacy(redraw), onOffline(redraw)];
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    for (const off of this.offs) off();
  }
  get dialog(): HTMLDialogElement {
    return this.querySelector('dialog')!;
  }
  async show() {
    this.open = true;
    await this.updateComplete;
    if (!this.dialog.open) this.dialog.showModal();
    this.querySelector<HTMLInputElement>('.to-find')?.focus();
  }
  close() {
    if (this.dialog?.open) this.dialog.close();
  }

  private async togglePrivate() {
    if (keeping() && !confirm(t('Save nothing on this device from now on? Your preferences and the offline copy are forgotten (your documents live in their links).'))) return;
    await setPrivate(keeping());
    toast(keeping() ? t('Saved on this device from now on') : t('Private: nothing saved'));
  }

  render() {
    const want = this.find.trim().toLowerCase();
    const found = apps().filter((a) => !want || a.name.toLowerCase().includes(want) || a.blurb.toLowerCase().includes(want));
    const offline = offlineState();
    const chosen = chosenLanguage() ?? '';
    return html`<dialog class="to-drawer" aria-label="TinyLittleOffice" @close=${() => (this.open = false)} @click=${(e: Event) => e.target === this.dialog && this.close()}>
      <div class="to-drawer-inner">
        <header class="to-drawer-head">
          <a class="to-brand" href="#/" @click=${() => this.close()}>TinyLittleOffice</a>
          <button type="button" class="to-btn to-tool" aria-label=${t('Close')} title=${t('Close')} @click=${() => this.close()}>${icon(UI.close)}</button>
        </header>
        ${this.open
          ? html`<nav class="to-drawer-apps" aria-label=${t('Apps')}>
                <input class="to-find" type="search" placeholder=${t('Find an app')} aria-label=${t('Find an app')} autocomplete="off" .value=${this.find} @input=${(e: Event) => (this.find = (e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.querySelector<HTMLElement>('.to-drawer-apps a')?.click()} />
                ${found.length ? found.map((a) => html`<a href=${routeHash(a.id)} @click=${() => this.close()}>${icon(a.icon, 20)}<span>${a.name}</span></a>`) : html`<p class="to-hint">${t('No app by that name')}</p>`}
              </nav>
              <section class="to-drawer-section">
                <label class="to-switch">
                  <input type="checkbox" role="switch" .checked=${keeping()} @change=${() => void this.togglePrivate()} />
                  <span class="to-switch-words"><b>${keeping() ? t('Saved on this device') : t('Private')}</b><small>${keeping() ? t('Your preferences and the offline copy stay here. Turn off to forget all of it.') : t('Nothing is saved on this device: no cookies, no trace.')}</small></span>
                </label>
                <label class="to-switch">
                  <input type="checkbox" role="switch" .checked=${offline.on} ?disabled=${offline.status === 'saving'} @change=${(e: Event) => void setOffline((e.target as HTMLInputElement).checked)} />
                  <span class="to-switch-words"><b>${t('Keep the app on this device')}</b><small>${offline.line}</small></span>
                </label>
              </section>
              <section class="to-drawer-section to-drawer-prefs">
                <label class="to-field">${icon(UI.language, 18)}<span>${t('Language')}</span>
                  <select @change=${(e: Event) => void setLanguage((e.target as HTMLSelectElement).value || null)}>
                    <option value="" ?selected=${!chosen}>${t('Match the device')}</option>
                    ${languages().map((c) => html`<option value=${c} ?selected=${c === chosen}>${languageName(c)}</option>`)}
                  </select>
                </label>
                <label class="to-field">${icon(theme() === 'dark' ? UI.moon : theme() === 'light' ? UI.sun : UI.auto, 18)}<span>${t('Theme')}</span>
                  <select @change=${(e: Event) => { setTheme((e.target as HTMLSelectElement).value as Theme); this.requestUpdate(); }}>
                    ${THEMES.map((th) => html`<option value=${th} ?selected=${th === theme()}>${themeName(th)}</option>`)}
                  </select>
                </label>
                <button type="button" class="to-btn to-drawer-about" @click=${() => void this.querySelector<ToDialog>('to-dialog')?.show()}>${icon(UI.info, 18)}<span>${t('About')}</span></button>
              </section>`
          : nothing}
      </div>
    </dialog>
    <to-dialog heading=${t('About TinyLittleOffice')} .body=${html`<p>${t('A tiny office suite that lives entirely in the URL. No server, no accounts, no saving: the link is the document.')}</p><p class="to-hint">${t('Nothing you write leaves your browser unless you share the link. A trip’s map is the one thing that asks the web by itself: its pictures come from OpenStreetMap while it is shown. Private by default; the switch in this menu keeps your settings on this device.')}</p>`}></to-dialog>`;
  }
}
customElements.define('to-drawer', ToDrawer);
