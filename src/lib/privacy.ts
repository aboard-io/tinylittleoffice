/**
 * Privacy, in one place. Everything that protects a document or touches
 * what the browser keeps goes through this one class:
 *
 *   - the password: a link is sealed (AES-256-GCM, key from PBKDF2) and
 *     unsealed here, and nowhere else;
 *   - the signature: a document is signed with this browser's key, and
 *     a signature checked, here;
 *   - the key itself: made, shown, imported, forgotten, here;
 *   - what the device keeps: the list of documents (off unless asked),
 *     preferences, the offline copy of the app, and the way to leave nothing.
 *
 * The shell and the widget (<to-privacy>) only call this; neither holds a
 * key, a locker or a password of its own.
 */
import { isSealed, newLocker, seal, unseal, type Locker } from './crypt.ts';
import { createSigner, fingerprintOf, localStorageStore, verify } from './sign.ts';
import { packEnvelope, quantizeCreated, signingMessage, unpackEnvelope, type Envelope } from './envelope.ts';
import { toBase64Url } from './codec.ts';
import { library, saving, setSaving } from './library.ts';

export type SigState = 'none' | 'checking' | 'valid' | 'invalid';
export { isSealed, saving, setSaving };

/** The preferences this site may keep, by key. */
export const PREFS = ['to-theme', 'tinyoffice.edit', 'tinyoffice.open', 'tinyoffice.nav', 'tinyoffice.size'];

export class Privacy {
  /** The password's key for this document, while it is locked. */
  locker: Locker | null = null;
  /** The signature on the document as last checked, and whose it is. */
  sig: SigState = 'none';
  signer: string | null = null;
  /** This browser's own key, as a fingerprint; null until one is made. */
  myKey: string | null = null;
  private api = createSigner(localStorageStore());
  private verifyRun = 0;
  /** Whoever shows this is told when something here changes, so they can redraw. */
  private listeners = new Set<() => void>();
  constructor(changed?: () => void) {
    if (changed) this.listeners.add(changed);
    void this.api.fingerprint().then((f) => this.set({ myKey: f }));
  }
  on(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  private changed() {
    for (const cb of this.listeners) cb();
  }
  private set(p: Partial<Pick<Privacy, 'locker' | 'sig' | 'signer' | 'myKey'>>) {
    Object.assign(this, p);
    this.changed();
  }

  /* ---------- the link ---------- */

  /** The document as a link's payload: sealed under the password if there is one. */
  async pack(env: Envelope, app: string): Promise<string> {
    const { flag, bytes } = packEnvelope(env, app);
    return this.locker ? seal(this.locker, flag, bytes) : flag + toBase64Url(bytes);
  }
  /** A new document, or one arriving by its link: no password until one is set. */
  reset() {
    this.set({ locker: null, sig: 'none', signer: null });
  }

  /* ---------- the password ---------- */

  /** Try a password on a sealed payload: the document if it opens, null if not. The locker is kept for re-sealing. */
  async unlock(password: string, sealed: string, app?: string): Promise<Envelope | null> {
    const r = await unseal(password, sealed);
    if (!r) return null;
    this.set({ locker: r.locker });
    return unpackEnvelope(r.flag, r.bytes, app);
  }
  async lock(password: string) {
    this.set({ locker: await newLocker(password) });
  }
  unlockForGood() {
    this.set({ locker: null });
  }

  /* ---------- the signature ---------- */

  async check(env: Envelope, app: string | null) {
    const run = ++this.verifyRun;
    const { key, sig } = env;
    if (!key || !sig || !app) return this.set({ sig: 'none', signer: null });
    this.set({ sig: 'checking' });
    const [ok, fp] = await Promise.all([verify(key, sig, signingMessage(app, env.created, env.body, env.title)), fingerprintOf(key)]);
    if (run === this.verifyRun) this.set({ sig: ok ? 'valid' : 'invalid', signer: fp });
  }
  /** Any message signed with this browser's key (made now if there is none yet): for a contract's parties, say. */
  async signMessage(message: string): Promise<{ key: string; sig: string }> {
    const r = await this.api.sign(message);
    this.set({ myKey: await this.api.fingerprint() });
    return r;
  }
  verifyMessage(key: string, sig: string, message: string): Promise<boolean> {
    return verify(key, sig, message);
  }
  fingerprintOf(key: string): Promise<string> {
    return fingerprintOf(key);
  }
  /** The document signed with this browser's key (made now if there is none yet). */
  async sign(env: Envelope, app: string): Promise<Envelope> {
    const created = env.created ?? quantizeCreated(Date.now());
    const { key, sig } = await this.api.sign(signingMessage(app, created, env.body, env.title));
    this.set({ myKey: await this.api.fingerprint() });
    return { ...env, created, key, sig };
  }
  unsign(env: Envelope): Envelope {
    const { key: _k, sig: _s, ...rest } = env;
    return rest;
  }

  /* ---------- the key ---------- */

  async exportKey(): Promise<string> {
    const text = await this.api.exportKey();
    this.set({ myKey: await this.api.fingerprint() });
    return text;
  }
  async importKey(text: string) {
    this.set({ myKey: await this.api.importKey(text.trim()) });
  }
  forgetKey() {
    this.api.forget();
    this.set({ myKey: null });
  }

  /* ---------- what the device keeps ---------- */

  prefsKept(): number {
    try {
      return PREFS.filter((k) => localStorage.getItem(k) !== null).length;
    } catch {
      return 0;
    }
  }
  forgetPrefs() {
    try {
      for (const k of PREFS) localStorage.removeItem(k);
    } catch {
      // (Nothing kept, then.)
    }
    this.changed();
  }
  documentsKept(): number {
    return saving() ? library().length : 0;
  }
  async offlineKept(): Promise<boolean> {
    return 'caches' in window ? (await caches.keys()).length > 0 : false;
  }
  async dropOffline() {
    if ('serviceWorker' in navigator) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    if ('caches' in window) for (const k of await caches.keys()) await caches.delete(k);
    this.changed();
  }
  /** Forget everything this site keeps in this browser. */
  async leaveNothing() {
    setSaving(false);
    this.api.forget();
    this.forgetPrefs();
    await this.dropOffline();
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('tinyoffice.') || k === 'to-theme') localStorage.removeItem(k);
    } catch {
      // (Nothing kept, then.)
    }
    this.set({ myKey: null });
  }
}

/** The one privacy object: the shell and any app that signs share it. */
export const privacy = new Privacy();
