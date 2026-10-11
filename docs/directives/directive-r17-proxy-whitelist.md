# R17-proxy-whitelist: pictures come from the whitelist, or not at all

**Paul, 2026-10-11:** *"Narrow the proxy to the whitelist."* Today a picture from a host on the whitelist (`src/kit/network.ts` TRUSTED) shows at once through the proxy, and a picture from any other host asks first ('Show pictures from the web') and then also goes through the proxy, which makes `media.tinylittleoffice.com` a fetcher of any public address for anyone with a script. Also found while answering Paul: the whitelist carries `*.githubusercontent.com`, which includes `camo.githubusercontent.com`, GitHub's own proxy of arbitrary addresses, so the whitelist was never closed; the synthesis of the review wrongly said otherwise.

## The design

- **The proxy serves the list and nothing else.** `media/media.ts` takes TRUSTED from `src/kit/network.ts` (r16-gates made that the one source) and answers 403 for any other host, before any fetch; redirects are followed only to a host on the list (r16-gates); the `t=1` flag is gone because every request is a trusted one.
- **The list loses GitHub.** Every githubusercontent host goes (`*.githubusercontent.com`, `raw.githubusercontent.com`, `user-images.githubusercontent.com`): Paul, 2026-10-11, *"Get rid of all GitHub sites in the whitelist."* `images.unsplash.com`'s reason no longer names the Website Builder (r17-no-site). The list is then: Wikimedia (upload.wikimedia.org, commons.wikimedia.org), the Internet Archive (archive.org, ia*.us.archive.org), images.unsplash.com, images.pexels.com, live.staticflickr.com. Nothing else.
- **No asking.** The 'Show pictures from the web' gate (`src/kit/pictures.ts` card, its strings and its setting) goes. A picture whose host is not on the list is drawn as a card with its address and alt, which opens in a new tab through the guard on a tap (the same card r15 draws when a fetch fails). The lint says it before anyone shares: `picture-untrusted` names the host and says the picture will be a card; the skill's picture paragraph lists the hosts.
- **Words.** The privacy dialog's and About's sentence about pictures (r16-honest) says: pictures from these sites are fetched through our proxy when a document opens, so the sites never see you; pictures from anywhere else are shown as a link. docs/threat-model.md and docs/network.md follow.

## Where

`media/media.ts`, `src/kit/media.ts`, `src/kit/pictures.ts`, `src/kit/network.ts`, `src/lint.ts`, `src/kit/privacy-dialog.ts`, `src/kit/drawer.ts`, `src/i18n/*.ts`, `test/media-worker.test.ts`, `test/link-guard.test.ts`, `test/browser/media.test.ts`, `test/browser/lazy-pictures.test.ts`, docs as named, `skill/tinyoffice/SKILL.tpl.md` and `npm run skill`.

## Proof

- `test/media-worker.test.ts`: a request for a host off the list is 403 with no fetch; `camo.githubusercontent.com` is off the list; a redirect to an off-list host is 502.
- `test/network.test.ts`: no wildcard entry matches a host outside its named kind; `trustedHost` is false for every githubusercontent host.
- `test/browser/media.test.ts`: an off-list picture is a card with the address, no request made (the request log is empty); a whitelisted one is fetched through the proxy lazily as before.
- The lint test: an off-list picture address gives `picture-untrusted`.

## Not this

- No new hosts, and no way for a reader to allow a host.
