// Print, or save as PDF: the browser prints the document alone, in a frame of its own, on the paper the text asks for.
import { test, expect } from 'vitest';
import { open, idle, until, menu, key } from './helpers-shell.ts';
import { encodeEnvelope } from '../../src/lib/envelope.ts';

const frame = () => document.querySelector<HTMLIFrameElement>('iframe.to-print');

test('the Download menu prints: a frame with the text on A4, gone when the dialog closes; Mod+P is the same', async () => {
  await open(`#/v0/write/${encodeEnvelope({ body: '---\npaper: a4\n---\n# Привет, κόσμε\n\nñandú' })}`);
  await menu('Download', 'Print, or save as PDF…');
  const f = await until(frame, 'the print frame');
  expect(f.srcdoc).toContain('@page{size:A4;margin:25mm}');
  expect(f.srcdoc).toContain('Привет, κόσμε');
  expect(f.srcdoc).not.toContain('to-toolbar');
  expect(f.getAttribute('aria-hidden')).toBe('true');
  // The dialog closed: the frame goes.
  f.contentWindow?.dispatchEvent(new Event('afterprint'));
  await idle();
  expect(frame()).toBeNull();
  // Mod+P prints rather than downloading a PDF file.
  await key('p', { ctrl: true }, document.body);
  await until(frame, 'the print frame again');
  expect(frame()!.srcdoc).toContain('size:A4');
});

test('a drawn document prints a page per picture at its own size', async () => {
  await open(`#/v0/deck/${encodeEnvelope({ body: '## One\n\n---\n\n## Two' })}`);
  await menu('Download', 'Print, or save as PDF…');
  const f = await until(frame, 'the print frame');
  expect(f.srcdoc).toContain('@page{size:10in 6.25in;margin:0}');
  // Two slides and the QR code the deck ends with.
  expect(f.srcdoc.match(/<figure>/g)).toHaveLength(3);
});
