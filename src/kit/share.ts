/**
 * Sharing without a server. The document is in the fragment, which nothing but the browser sees, so a
 * link is the whole of it: copied, shown as a QR code, handed to the device's share sheet, or shortened
 * (kit/short.ts) with the ciphertext alone on the server.
 */
import { t } from './i18n.ts';
import { toast } from './toast.ts';

export async function copyText(text: string, said = t('Link copied')): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast(said);
    return true;
  } catch {
    toast(t('Could not copy'));
    return false;
  }
}

/** Whether the device has a share sheet (a phone, mostly). */
export const canShareNative = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/** The link, and a picture of the document if the device will take one, to the share sheet. */
export async function shareNative(title: string, url: string, png?: Uint8Array | null) {
  const data: ShareData = { title, text: title, url };
  if (png) {
    const file = new File([png as BlobPart], `${title || 'document'}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) data.files = [file];
  }
  try {
    await navigator.share(data);
  } catch {
    /* dismissed */
  }
}
