/**
 * The site's headers, filled at the end of the build (vite.config.ts): public/_headers holds placeholders
 * the Content-Security-Policy is written from. {{scripts}} is the hash of every script the apps' pages
 * carry (src/kit/page.ts); {{media}} is where pictures may come from and an export may fetch their bytes:
 * the picture proxy's origin (src/kit/media.ts), or, with VITE_MEDIA_URL set empty (no proxy), any https:
 * address, since pictures then load from their own sites. {{img}}, {{connect}}, {{frame}} and {{media-src}}
 * are the hosts src/kit/network.ts allows by each directive (the proxy aside: it is {{media}}), so the
 * policy allows what docs/network.md lists and nothing else.
 */
import { MEDIA_DEFAULT } from '../src/kit/media.ts';
import { NETWORK, reaches, type Directive } from '../src/kit/network.ts';

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

/** The sources the registry allows by one directive: "https://host", or "https:" for any address. */
export function sources(directive: Directive): string[] {
  return reaches()
    .filter((r) => r !== NETWORK.media && r.csp?.includes(directive))
    .map((r) => (r.host === '*' ? 'https:' : `https://${r.host}`))
    .filter((s, i, all) => all.indexOf(s) === i);
}

/** The headers file with its placeholders filled. */
export function fillHeaders(text: string, { scripts, media }: { scripts: string[]; media: string }): string {
  return text
    .replaceAll('{{scripts}}', scripts.join(' '))
    .replaceAll('{{media}}', media)
    .replaceAll('{{img}}', sources('img').join(' '))
    .replaceAll('{{connect}}', sources('connect').join(' '))
    .replaceAll('{{frame}}', sources('frame').join(' '))
    .replaceAll('{{media-src}}', sources('media').join(' '));
}
