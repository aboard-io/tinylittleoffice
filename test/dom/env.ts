// What happy-dom leaves out that the kit asks for at load: font loading (text is measured by estimate here instead).
if (!('fonts' in document)) Object.defineProperty(document, 'fonts', { value: { load: () => Promise.resolve([]), ready: Promise.resolve() } });
// No network in these tests: what asks (map tiles, the fonts drawn into pictures) gets a quick refusal, as offline.
const requested: string[] = [];
globalThis.fetch = (async (input: RequestInfo | URL) => {
  requested.push(String(input instanceof Request ? input.url : input));
  return new Response('', { status: 503 });
}) as typeof fetch;
(globalThis as unknown as { __requested: string[] }).__requested = requested;
// No animations: Shoelace cancels a dialog's running ones as it opens, and happy-dom's cancel rejects a promise nobody awaits.
Element.prototype.getAnimations = () => [];
Element.prototype.animate = function () {
  return { finished: Promise.resolve(), cancel() {}, finish() {}, addEventListener() {} } as unknown as Animation;
};
// The rich-text field asks which marks are on where the caret is; happy-dom has no editing commands.
const doc = document as unknown as Record<string, unknown>;
doc.queryCommandValue ??= () => '';
doc.queryCommandState ??= () => false;
doc.execCommand ??= () => false;
