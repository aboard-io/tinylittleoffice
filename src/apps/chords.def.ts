/** Chord chart: words with the chords above them, in any key. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePrint, onLetter } from '../lib/print.ts';
import { text, textWidth, ACCENT, MUTED } from '../kit/core.ts';

const NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const SAME: Record<string, string> = { Db: 'C#', 'D#': 'Eb', Gb: 'F#', 'G#': 'Ab', 'A#': 'Bb' };
/** A chord moved up by so many semitones: "Am7/G" up 2 is "Bm7/A". */
export const transpose = (chord: string, by: number) => chord.replace(/[A-G][#b]?/g, (n) => NOTES[(((NOTES.indexOf(SAME[n] ?? n) + by) % 12) + 12) % 12]);

export const spec = {
  form: [
    { name: 'Song', is: '# {Song}', once: true },
    { name: 'Transpose', is: 'transpose: {Semitones up}', once: true },
    { name: 'Part', is: '## {Part}', head: true },
    { name: 'Words', is: '{Words, with chords in brackets}' },
  ] as LineKind[],
  hint: '"# Song", then the words with chords in square brackets where they fall: "[G]Row, row, [C]row". "## Chorus" names a part; "transpose: 2" moves every chord up two semitones.',
  example: '# Row Your Boat\ntranspose: 0\n## Verse\n[C]Row, row, row your boat\n[C]Gently down the [G]stream\n[C]Merrily, merrily, merrily, merrily\n[G]Life is but a [C]dream',
  sheets: (body: string) => {
    const by = parseInt(/^transpose\s*:\s*(-?\d+)/im.exec(body)?.[1] ?? '0');
    let y = 0;
    let svg = '';
    for (const raw of body.split('\n')) {
      const l = raw.trim();
      if (!l || /^transpose\s*:/i.test(l)) continue;
      if (l.startsWith('## ')) svg += text(0, (y += 44), l.slice(3).toUpperCase(), { px: 13, bold: true, fill: MUTED });
      else if (l.startsWith('# ')) svg += text(0, (y += 50), l.slice(2), { px: 38, bold: true });
      else {
        // Each chord sits over the word it falls on, and never on top of the chord before it.
        const parts = l.split(/\[([^\]]+)\]/);
        const chords = parts.length > 1;
        y += chords ? 52 : 30;
        let [x, free] = [0, 0];
        parts.forEach((p, i) => {
          if (i % 2) {
            const c = transpose(p, by);
            const at = Math.max(x, free);
            svg += text(at, y - 24, c, { px: 16, bold: true, fill: ACCENT });
            free = at + textWidth(c, 16, true) + 8;
          } else {
            svg += text(x, y, p, { px: 19 });
            x += textWidth(p, 19);
          }
        });
      }
    }
    return [onLetter({ w: 680, h: Math.max(200, y + 30), svg }, 68)];
  },
};

export default definePrint({ id: 'chords', under: undefined, group: 'Create', name: 'Chord chart', icon: 'chords', blurb: 'A song sheet: words with chords above them, transposed to any key.' }, spec);
