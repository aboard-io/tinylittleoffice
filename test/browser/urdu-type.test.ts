// Urdu reads in Nastaliq where the device has it (Paul, 2026-10-11: "choose the best path for colloquial speakers of
// Urdu"): the stylesheet asks for the device's Nastaliq first under :lang(ur), the Arabic stack after it, so a device
// without one sets Naskh as it did; and Nastaliq's taller letters get the taller line. Arabic is untouched.
import { test, expect, afterEach } from 'vitest';
import '../../src/styles.css';

afterEach(() => {
  document.documentElement.lang = 'en';
});

const style = (lang: string) => {
  document.documentElement.lang = lang;
  const body = getComputedStyle(document.body);
  const label = getComputedStyle(document.documentElement).getPropertyValue('--to-line-label').trim();
  return { font: body.fontFamily, line: parseFloat(body.lineHeight) / parseFloat(body.fontSize), label };
};

test('in Urdu the body is set in Nastaliq first, on the taller line; the labels’ line is the taller one too', () => {
  const ur = style('ur');
  expect(ur.font).toMatch(/^"?Noto Nastaliq Urdu"?, "?Urdu Typesetting"?, "?Jameel Noori Nastaleeq"?, "?Awami Nastaliq"?, system-ui/);
  expect(ur.line).toBeCloseTo(1.9, 2);
  expect(ur.label).toBe('1.6');
});

test('in Arabic and in English neither: Plex’s stack and the line of every other language', () => {
  for (const lang of ['ar', 'en']) {
    const s = style(lang);
    expect(s.font, lang).toMatch(/^"?IBM Plex Sans"?, /);
    expect(s.line, lang).toBeCloseTo(1.5, 2);
    expect(s.label, lang).toBe('1.25');
  }
});

// A footnote's words (<to-text class="to-note-words">) are body text too, so they take the line token: Nastaliq's
// descenders are not clipped in Urdu, and every other language keeps the body's line.
const noteLine = (lang: string) => {
  document.documentElement.lang = lang;
  const words = document.createElement('to-text');
  words.className = 'to-note-words';
  const tx = document.createElement('div');
  tx.className = 'tx';
  words.append(tx);
  const note = document.createElement('div');
  note.className = 'to-note';
  note.append(words);
  document.body.append(note);
  const s = getComputedStyle(tx);
  const line = parseFloat(s.lineHeight) / parseFloat(s.fontSize);
  note.remove();
  return line;
};

test('a footnote’s words take the line token: 1.9 in Urdu, the body’s line in Arabic and English', () => {
  expect(noteLine('ur')).toBeCloseTo(1.9, 2);
  for (const lang of ['ar', 'en']) expect(noteLine(lang), lang).toBeCloseTo(1.5, 2);
});
