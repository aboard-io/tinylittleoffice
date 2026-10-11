# R16-gates: the guard and the proxy hold everywhere

**The review of 2026-10-11.** The refugee, in Arabic on an iPhone: *"a mailto link with a hidden reversal character shows a fake address in large type in the link warning."* The privacy expert: *"Website Builder documents are not covered by the link guard … the picture whitelist's wildcard and the proxy's redirect-following can get round the 'ask before showing pictures' gate."*

## What is wrong today

1. `src/kit/link-guard.ts` `where()` draws `decodeURIComponent(u.pathname)` for mailto: and tel: as the big name. `ask(new URL('mailto:%E2%80%AEur.liam-kaeps@ofni.rchnu'))` drew 'nhcr.info@speak-mail.ru' (measured in WebKit, Arabic). `.lg-host` and `.lg-url` have no direction or isolation (kit.css:2257, :2276), so in RTL an https path's slash jumps to the front.
2. `src/apps/site/view.ts` (page script around :97) sets `target=_blank` on every link that does not start with `#`. The display iframe (`shell.ts:687`) allows `allow-popups allow-popups-to-escape-sandbox`, and the shell's capture-phase guard cannot see clicks inside srcdoc. A 'Pay now' button opens anywhere, http included, with no guard. The threat model claims no exception.
3. The browser decides a picture's trust from the first URL's host (`src/kit/media.ts` trusted()). The proxy (`media/media.ts` follow()) then follows up to three redirects to any public https host, so an open redirect on a trusted host bypasses 'Show pictures from the web'. `network.ts` also trusts `*.archive.org`. (The reviewer's camo/githubusercontent point does not hold: network.ts lists exact GitHub hosts.)

## The design

- **The guard shows what is there.** In where(), a mailto: or tel: whose decoded name holds any bidi control or invisible character (U+200B–200F, U+202A–202E, U+2066–2069, U+FEFF) is refused with 'This link hides characters in its address'. In an https URL they are drawn visibly. `.lg-host` and `.lg-url` get `dir="ltr"` and `unicode-bidi: isolate`.
- **A website's links go through the guard.** The page script in site/view.ts, on a link that leaves the page, calls `preventDefault` and `parent.postMessage({ site: stamp, do: 'link', href }, '*')`. The shell's display view and the site editor's onMessage (which already checks `e.source` and the stamp) pass it to `openLink()`. Then `allow-popups-to-escape-sandbox` comes off the display frame. The exported website (a file of its own) is unchanged.
- **Trusted means the same on the server.** `pictureSrc` adds `&t=1` for a picture shown as trusted. With t=1, media.ts follows a redirect only to a host the shared trusted list names (the same list network.ts holds; archive.org's download addresses redirect to ia*.us.archive.org, which stays within it), and otherwise answers 502 and the page shows its card. Commons' `Special:FilePath` is handled by r15's lint ('use the upload.wikimedia.org address'). `*.archive.org` becomes the exact storage-host pattern `ia*.us.archive.org`, and network.ts, the CSP and the /network page follow from the one list as they do now.

## Where

`src/kit/link-guard.ts`, `src/styles/kit.css`, `src/apps/site/view.ts`, `src/apps/site/editor.ts`, `src/kit/shell.ts` (the display frame and its message), `src/kit/media.ts`, `media/media.ts`, `src/kit/network.ts`, and `docs/threat-model.md` (the claim made true, then left as is).

## Proof

- `test/link-guard.test.ts`: where() refuses the RLO mailto, and `leaving()` and where() are tested for tel: with U+2066.
- `test/browser/guard.test.ts` in `ar`: `.lg-host`'s text equals the expected string, and its computed direction is ltr.
- A site editor browser test: a click on an outbound link inside the frame opens the guard naming its host. The display frame's sandbox has no escape flag.
- `test/media-worker.test.ts`: a t=1 request that redirects to an untrusted host gets 502, a redirect to a trusted host is followed, and trustedHost('evil.archive.org.example') is false.
- `test/csp.test.ts` and `test/network.test.ts` still hold.

## Not this

- No new hosts on the whitelist.
- No change to how untrusted pictures are asked for.