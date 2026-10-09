/**
 * The site's headers, filled at the end of the build (vite.config.ts): public/_headers holds placeholders
 * the Content-Security-Policy is written from. {{scripts}} is the hash of every script the apps' pages
 * carry (src/kit/page.ts); {{media}} is where pictures may come from and an export may fetch their bytes:
 * the picture proxy's origin (src/kit/media.ts), or, with VITE_MEDIA_URL set empty (no proxy), any https:
 * address, since pictures then load from their own sites.
 */
import { MEDIA_DEFAULT } from '../src/kit/media.ts';

/** The CSP source for pictures, from VITE_MEDIA_URL as the build sees it (undefined: the default proxy). */
export function mediaSource(env: string | undefined): string {
  const base = env ?? MEDIA_DEFAULT;
  if (!base) return 'https:';
  try {
    return new URL(base).origin;
  } catch {
    // A path on the site itself ('/media'): 'self' already allows it.
    return "'self'";
  }
}

/** The headers file with its placeholders filled. */
export function fillHeaders(text: string, { scripts, media }: { scripts: string[]; media: string }): string {
  return text.replaceAll('{{scripts}}', scripts.join(' ')).replaceAll('{{media}}', media);
}
