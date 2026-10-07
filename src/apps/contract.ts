/**
 * <to-contract>: the shared text editor, with a panel for signing. See
 * contract.def.ts for what a signature here does and does not prove.
 */
import { html, nothing, state, defineElement, btn, icon, errorText, UI } from '../kit.ts';
import { PageView } from './diagram-page.ts';
import { privacy } from '../lib/privacy.ts';
import { keyMark, parseContract, serializeContract, signedMessage, type Signature } from './contract.def.ts';

class ToContract extends PageView {
  static app = 'contract';
  @state() private who = '';
  /** Whether each signature still matches the text: by public key + name. */
  @state() private checked: Record<string, { ok: boolean; print: string }> = {};
  @state() private note = '';
  private checking = '';

  protected textOf(doc: string) {
    return parseContract(doc).text;
  }
  protected withText(doc: string, text: string) {
    // The signatures stay as they were: if the words changed, they will no longer match, and say so.
    return serializeContract(text, parseContract(doc).signatures);
  }

  protected updated() {
    if (this.checking !== this.doc) void this.check(this.doc);
  }

  /** Check every signature against the text as it stands. */
  private async check(doc: string) {
    this.checking = doc;
    const c = parseContract(doc);
    const out: Record<string, { ok: boolean; print: string }> = {};
    for (const s of c.signatures) out[s.key + s.name] = { ok: await privacy.verifyMessage(s.key, s.sig, signedMessage(c.text, s.name)).catch(() => false), print: await privacy.fingerprintOf(s.key).catch(() => keyMark(s.key)) };
    if (this.checking === doc) this.checked = out;
  }

  private async sign() {
    const name = this.who.trim();
    const c = parseContract(this.doc);
    if (!name || !c.text.trim()) return;
    try {
      const { key, sig } = await privacy.signMessage(signedMessage(c.text, name));
      // One signature per key: signing again (after a change, say) replaces your own.
      this.commit(serializeContract(c.text, [...c.signatures.filter((s) => s.key !== key), { name, key, sig }]));
      this.note = `Signed as ${name}. Send the link to the other party.`;
    } catch (err) {
      this.note = errorText(err, 'Could not sign');
    }
  }

  private unsign(s: Signature) {
    const c = parseContract(this.doc);
    this.commit(serializeContract(c.text, c.signatures.filter((x) => x !== s && !(x.key === s.key && x.name === s.name))));
  }

  protected extra() {
    const c = parseContract(this.doc);
    return html`<div class="contract-sign" role="group" aria-label="Signatures">
      <ul>
        ${c.signatures.map((s) => {
          const v = this.checked[s.key + s.name];
          return html`<li class=${v ? (v.ok ? 'ok' : 'bad') : ''}>
            ${icon(v?.ok === false ? UI.shieldOff : UI.shield, 16)}
            <b>${s.name}</b>
            <span>${!v ? 'Checking…' : v.ok ? 'Signed these exact words' : 'The words have changed since this was signed'}</span>
            <code data-tip="The fingerprint of the key that signed. Compare it with the signer to be sure it is theirs.">${v?.print ?? keyMark(s.key)}</code>
            ${btn(`Remove ${s.name}'s signature`, 'close', () => this.unsign(s))}
          </li>`;
        })}
        ${c.signatures.length ? nothing : html`<li class="none">Nobody has signed yet.</li>`}
      </ul>
      <div class="row">
        <sl-input size="small" class="sr-label" label="Your name" placeholder="Your name" .value=${this.who} @sl-input=${(e: Event) => (this.who = (e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.sign()}></sl-input>
        <sl-button size="small" variant="primary" ?disabled=${!this.who.trim() || !c.text.trim()} @click=${this.sign}>${icon(UI.shield, 14)} Sign</sl-button>
        <span class="to-hint" role="status">${this.note || 'A signature shows that the holder of a key signed these exact words. It does not prove who holds the key: compare fingerprints to be sure.'}</span>
      </div>
    </div>`;
  }
}
defineElement('contract', ToContract);
