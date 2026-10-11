# R18-webm: a video from the frames

**Paul, 2026-10-11:** *"Add a webm exporter too."* The Animator saves an animated GIF and an animated SVG; the Presentation Builder saves a film of itself as a GIF. Both come through `src/kit/gif.ts`, a hand-rolled encoder, from frames the app already draws (`animGif` in `src/apps/anim/def.ts`; `deckFrames` and the `gif` format in `src/apps/deck/def.ts`). A GIF is 256 colors a frame and large; a WebM is what a phone, a chat and a web page play.

## The design

- **One encoder, two apps.** `src/kit/webm.ts`: `webmOf(frames: () => AsyncIterable<{ canvas: OffscreenCanvas | HTMLCanvasElement; ms: number }>, w, h): Promise<Uint8Array | null>`, or a shape near it: the app hands over the same frames its GIF is built from, drawn through `kit/raster.ts` onto a canvas at the GIF's size (the Animator's stage; the Deck's 960 wide), each with its duration. The browser encodes them: WebCodecs `VideoEncoder`, `vp09.00.10.08` where `VideoEncoder.isConfigSupported` says yes, else `vp8`, at a bitrate that reads well for flat drawings (test two; keep the smaller that a reviewer cannot tell apart by file size and a pixel diff of a decoded frame); each frame a `VideoFrame` from its canvas with the running time as its timestamp and its length as its duration; the first a key frame and one every two seconds after.
- **Our own muxer, no DOM in it.** WebM is Matroska: an EBML header, a Segment with Info (timecode scale, duration), Tracks (one video track, `V_VP9` or `V_VP8`, the size), and Clusters of SimpleBlocks carrying the encoder's chunks with their timecodes, then Cues so a player can seek. Write it in `webm.ts` by hand, the way `gif.ts` writes GIF89a: unknown-size elements are not used (every size is written once the length is known; build the chunk list first, then the bytes), so the file plays in every browser and in VLC. Browsers have no muxer (the native API considered: `MediaRecorder` on `canvas.captureStream()`, which does mux WebM, but records in real time with the clock's jitter, so a ten-second animation takes ten seconds and frames land late, and Safari's records MP4 and never WebM; WebCodecs gives exact frame times and finishes as fast as the encoder runs). No dependency.
- **Offered only where it works.** `Export` in `src/kit/app.ts` gains `available?: () => Promise<boolean>` and `formatsOf` resolves it once per session (cached): a format whose check says no is not in the Download table. WebM's check is `'VideoEncoder' in self` and one `isConfigSupported` for VP9 or VP8 at the size. Where only H.264 is available (WebKit today, measure it on the box and say so in the report) there is no WebM row: never an MP4 called WebM, never a toast at save time saying it cannot.
- **The rows.** The Animator: 'Video (WebM)' after 'Animated GIF'. The Deck: 'A film of the deck (WebM)' after the GIF film. Both strings in every language of `src/i18n/` (American English; the other languages as the common contract says, by `npm run i18n:extract` and a translation in the house voice of each). `docs/exports.md` (or wherever `scripts/exports-doc.ts` writes the formats table) regenerated.
- **The API and the CLI**: `file <link> --as webm` works under node only if an encoder exists there; it does not, so the CLI says 'WebM is made in the browser: open the link and save it from Download.' and exits 2, listed in the help next to the format.

## Proof

- `test/webm.test.ts` (unit, no DOM): a tiny EBML reader in the test walks a file muxed from three fake chunks and finds the header's DocType 'webm', one video track with the codec id and the size, the clusters' blocks at 0, 100 and 250 ms, the Info duration, and Cues pointing at the key frames; every element's declared size equals its bytes.
- `test/browser/webm.test.ts` (Chromium): the Animator's sample document saved as WebM decodes in a `<video>` with `videoWidth` the stage's and `duration` within one frame of the frames' total; the Deck's film likewise; a browser with `VideoEncoder` removed (stub it) has no WebM row.
- The exports table test (where the formats are listed per app) gains the two rows.

## Not this

- No audio track, no MP4, no H.264, no transcoding of a GIF.
- No change to the GIF or the animated SVG.
