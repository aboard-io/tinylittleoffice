/**
 * Sharing without a server. The document is in the fragment, which nothing but the browser sees, so a
 * link is the whole of it: copied, shown as a QR code, handed to the device's share sheet, or shortened
 * (kit/share/short.ts) with the ciphertext alone on the server.
 */
import { t } from '../core/i18n.ts';
import { toast } from '../core/say.ts';
import { origin } from '../core/network.ts';

export async function copyText(text: string, said = t('share-link-copied')): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast(said);
    return true;
  } catch {
    toast(t('share-could-not-copy'));
    return false;
  }
}

/**
 * Words still being made (a short link) put on the clipboard as soon as they are: the copy is asked for inside the
 * press, as a ClipboardItem holding the promise, so Safari, which allows a copy only while the press lasts, takes it
 * too. Where there is no ClipboardItem, the words are written when they come.
 */
export async function copyLater(text: Promise<string>, said = t('share-link-copied')): Promise<boolean> {
  try {
    if (typeof ClipboardItem === 'function') await navigator.clipboard.write([new ClipboardItem({ 'text/plain': text.then((s) => new Blob([s], { type: 'text/plain' })) })]);
    else await navigator.clipboard.writeText(await text);
    toast(said);
    return true;
  } catch {
    toast(t('share-could-not-copy'));
    return false;
  }
}

/** Whether the device has a share sheet (a phone, mostly). */
export const canShareNative = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/**
 * Chromium on macOS (Chrome, Edge) says it takes files (canShare) and then never opens its sheet for a share holding
 * one, rejecting it as though dismissed, a second or two later, so no timing tells the two apart (seen 2026-11-25:
 * the link alone opens it there). It is given the link alone; every other sheet, Safari's on a Mac too, the picture.
 */
function sheetTakesFiles(): boolean {
  const ua = (navigator as Navigator & { userAgentData?: { platform?: string; brands?: { brand: string }[] } }).userAgentData;
  return !(ua?.platform === 'macOS' && ua.brands?.some((b) => b.brand === 'Chromium'));
}

/**
 * The link, and a picture of the document if the device will take one, to the share sheet: shared, dismissed, or
 * refused (the browser's NotAllowedError: the press it was asked in had passed, the link made first taking too long).
 */
export async function shareNative(title: string, url: string, png?: Uint8Array | null, file = 'document.png'): Promise<'shared' | 'dismissed' | 'refused'> {
  const data: ShareData = { title, text: title, url };
  if (png && sheetTakesFiles()) {
    // Its name a slug ("garden-plan.png"): a title's "#", slashes and spaces are no file name a sheet need take.
    const picture = new File([png as BlobPart], file, { type: 'image/png' });
    if (navigator.canShare?.({ files: [picture] })) data.files = [picture];
  }
  try {
    await navigator.share(data);
    return 'shared';
  } catch (err) {
    return err instanceof DOMException && err.name === 'NotAllowedError' ? 'refused' : 'dismissed';
  }
}

/* ---------- the services' own compose boxes, and the embed code ---------- */

/** The services a link can be posted to: each one's compose box, opened with the title and the link (their share URLs, no script of theirs). */
export type Service = 'bluesky' | 'mastodon' | 'x' | 'linkedin' | 'email';
export const SERVICES: readonly Service[] = ['bluesky', 'mastodon', 'x', 'linkedin', 'email'];
export const SERVICE_NAMES: Record<Service, string> = { bluesky: 'Bluesky', mastodon: 'Mastodon', x: 'X', linkedin: 'LinkedIn', email: 'Email' };

/** A Mastodon server as typed ("@me@mastodon.social", "https://hachyderm.io/"): its host alone, or '' when it is not one. */
export function mastodonHost(typed: string): string {
  const s = typed
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^@?[^@/\s]+@/, '')
    .replace(/[/?#].*$/, '')
    .toLowerCase();
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/.test(s) ? s : '';
}

/** Where a service's compose box is, with this title and link in it; '' for Mastodon with no server known. */
export function shareUrl(service: Service, title: string, link: string, mastodon = ''): string {
  const q = (o: Record<string, string>) => new URLSearchParams(o).toString();
  const text = title ? `${title} ${link}` : link;
  switch (service) {
    case 'bluesky':
      return `${origin('bskyShare')}/intent/compose?${q({ text })}`;
    case 'mastodon':
      return mastodon ? `https://${mastodon}/share?${q({ text })}` : '';
    case 'x':
      return `${origin('xShare')}/intent/post?${q({ text: title, url: link })}`;
    case 'linkedin':
      return `${origin('linkedin')}/sharing/share-offsite/?${q({ url: link })}`;
    case 'email':
      return `mailto:?${q({ subject: title, body: link }).replace(/\+/g, '%20')}`;
  }
}

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * The snippet that shows a document on another page: an iframe of its embed page ("<site>embed/#/v1/<app>.embed/…",
 * the one address the site lets another page frame), lazy, sending no referrer, as wide as its column allows.
 */
export function embedCode(src: string, title: string, w = 640, h = 480): string {
  return `<iframe src="${attr(src)}" title="${attr(title)}" loading="lazy" referrerpolicy="no-referrer" allowfullscreen style="width:100%;max-width:${w}px;aspect-ratio:${w}/${h};border:1px solid #d4d4d8;border-radius:8px"></iframe>`;
}
