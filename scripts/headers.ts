/**
 * The site's headers, filled at the end of the build (vite.config.ts): public/_headers holds placeholders
 * the Content-Security-Policy is written from. {{scripts}} is the hash of every script the apps' pages
 * carry (src/kit/page.ts); {{img}} and {{connect}} are the hosts src/kit/network.ts allows by each
 * directive, so the policy allows what docs/network.md lists and nothing else.
 */
import { reaches, type Directive } from '../src/kit/network.ts';

/** The sources the registry allows by one directive: "https://host". */
export function sources(directive: Directive): string[] {
  return reaches()
    .filter((r) => r.csp?.includes(directive))
    .map((r) => `https://${r.host}`)
    .filter((s, i, all) => all.indexOf(s) === i);
}

/** The headers file with its placeholders filled. */
export function fillHeaders(text: string, { scripts }: { scripts: string[] }): string {
  return text.replaceAll('{{scripts}}', scripts.join(' ')).replaceAll('{{img}}', sources('img').join(' ')).replaceAll('{{connect}}', sources('connect').join(' '));
}
