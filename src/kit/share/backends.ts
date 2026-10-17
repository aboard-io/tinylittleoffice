/**
 * The five backends behind one shape (backends/README.md, "Five backends, one shape"): where a document lives, as the
 * page that holds an editor sees it. `open(address, ask)` gives the document an address names and what to do with each
 * change; the backend is found by the address's form, and `place` puts what was opened in an editor on the page. The
 * link and the sealed link are the site's own ways (the codec, the seal), the short link opens to one of them, and a
 * journal's address is a shared document (src/kit/share/multiparty.ts); a person's store (src/kit/share/sync.ts) is an
 * index of those, and is opened by its own class.
 */
import type { Op } from '../../doc/index.ts';
import { decodeDoc, encodeDoc } from '../core/codec.ts';
import { mount, type Mounted, type Own } from '../core/mount.ts';
import { parseHash, routeHash } from '../core/route.ts';
import { pack, unlock } from './crypt.ts';
import { openShared } from './multiparty.ts';
import { isJournalAddress } from './journal.ts';
import { unshorten } from './short.ts';

/** What a backend may ask the page for. */
export interface Ask {
  /** A password for a sealed document; null when the person gives none. */
  password?(): Promise<string | null>;
  /** The name a shared document's changes carry: the person's own word. */
  by?: string;
}

/** A document, open: its app and text, and what the page does with it. */
export interface Opened {
  app: string;
  text: string;
  /** The address that holds the document now: the one opened, until a change gives another (a link's, with every edit). */
  address: string;
  /** Shown, not edited: a reader's address. */
  readOnly?: boolean;
  /** A change the editor told, as its ops and the text after them: kept; the address that holds the document now. */
  changed(ops: Op[], text: string): Promise<string>;
  /** Others' changes, where there can be any: ops to hand to the editor's applyRemote. */
  remote?(fn: (ops: Op[]) => void): () => void;
  /** The document taken whole again, where that can happen: the editor's new value. */
  reset?(fn: (text: string) => void): () => void;
  close(): void;
}

export interface Backend {
  name: 'link' | 'sealed' | 'short' | 'multiparty';
  /** Whether an address is this backend's. */
  owns(address: string): boolean;
  /** The document the address names, or null when it names none this backend can open (a wrong password, a link gone). */
  open(address: string, ask?: Ask): Promise<Opened | null>;
}

/** An address's fragment and what is before it: "https://site/write/#/v1/write/…" or "#/v1/write/…" alone. */
const split = (address: string): { before: string; hash: string } => {
  const i = address.indexOf('#');
  return i < 0 ? { before: address, hash: '' } : { before: address.slice(0, i), hash: address.slice(i) };
};
const still = { close() {} };

/** The document in its address (docs/threat-model.md: the link is the document). */
export const link: Backend = {
  name: 'link',
  owns: (address) => {
    const { app, sealed } = parseHash(split(address).hash);
    return !!app && !sealed;
  },
  async open(address) {
    const { before, hash } = split(address);
    const { app, payload, sealed } = parseHash(hash);
    if (!app || sealed) return null;
    const text = decodeDoc(payload);
    if (payload && !text) return null;
    return { app, text, address, changed: async (_ops, next) => before + routeHash(app, encodeDoc(next)), ...still };
  },
};

/** The document in its address under a password (docs/crypto/password.md). */
export const sealed: Backend = {
  name: 'sealed',
  owns: (address) => {
    const { app, sealed } = parseHash(split(address).hash);
    return !!app && sealed;
  },
  async open(address, ask) {
    const { before, hash } = split(address);
    const { app, payload, sealed } = parseHash(hash);
    if (!app || !sealed) return null;
    const password = await ask?.password?.();
    const opened = password ? await unlock(password, payload) : null;
    if (!opened) return null;
    return { app, text: opened.text, address, changed: async (_ops, next) => before + routeHash(app, await pack(next, opened.locker)), ...still };
  },
};

const SHORT = /^(https?:\/\/[^#?]*\/)([a-z0-9]{7})#([A-Za-z0-9_~-]{43})$/;
/** A short link: the long link, fetched and opened, then that link's own backend (docs/crypto/short-links.md). */
export const short: Backend = {
  name: 'short',
  owns: (address) => SHORT.test(address.trim()),
  async open(address, ask) {
    const m = SHORT.exec(address.trim());
    if (!m) return null;
    const res = await fetch(`${m[1]}api/${m[2]}`);
    if (!res.ok) return null;
    const { c, iv } = (await res.json()) as { c: string; iv: string };
    let long: string;
    try {
      long = await unshorten(c, iv, m[3]);
    } catch {
      return null;
    }
    return open(long, ask);
  },
};

/** A document several people edit at once, in a journal (src/kit/share/multiparty.ts). */
export const multiparty: Backend = {
  name: 'multiparty',
  owns: isJournalAddress,
  async open(address, ask) {
    const shared = await openShared(address, ask?.by ?? '');
    if (!shared) return null;
    return {
      app: shared.app,
      text: shared.text,
      address,
      readOnly: !shared.writes,
      changed: async (ops) => (shared.changed(ops), address),
      remote: (fn) => shared.onRemote(fn),
      reset: (fn) => shared.onReset(fn),
      close: () => shared.close(),
    };
  },
};

/** Every backend, in the order addresses are tried. */
export const backends: readonly Backend[] = [short, sealed, link, multiparty];

/** The document an address names, by whichever backend owns the address; null for an address none does, or that will not open. */
export function open(address: string, ask?: Ask): Promise<Opened | null> {
  const backend = backends.find((b) => b.owns(address));
  return backend ? backend.open(address, ask) : Promise.resolve(null);
}

/** What `place` gives back: the editor mounted (kit/core/mount.ts Mounted), and the way to stop. */
export interface Placement extends Mounted {
  close(): void;
}
/**
 * An opened document put in an editor on the page: mounted with its text, each change handed to the backend, and the
 * backend's own news (others' ops, the document taken whole again) handed to the editor. `moved` is told each time the
 * address that holds the document changes (a link's, with every edit); `own` is the page's, as for `mount`.
 */
export async function place<C>(opened: Opened, into: Element, moved?: (address: string) => void, own?: Own<C>): Promise<Placement> {
  let at = opened.address;
  const mounted = await mount(opened.app, opened.text, into, () => {}, {
    ...own,
    readOnly: own?.readOnly || opened.readOnly,
    onOps: (ops, base) => {
      own?.onOps?.(ops, base);
      void opened.changed(ops, mounted.editor.value).then(
        (address) => void (address !== at && moved?.((at = address))),
        () => {},
      );
    },
  });
  const offRemote = opened.remote?.(mounted.applyRemote) ?? (() => {});
  const offReset = opened.reset?.((text) => void (mounted.editor.value = text)) ?? (() => {});
  return {
    ...mounted,
    close() {
      offRemote();
      offReset();
      opened.close();
    },
  };
}
