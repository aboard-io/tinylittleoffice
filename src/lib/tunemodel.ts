/**
 * Tune document model: a two-bar piano roll.
 * The grid is 32 steps (sixteenth notes) wide and two octaves (C3 to B4)
 * tall. Format: the tempo in beats per minute (base 36), a ".", then three
 * base-36 characters per note: step, pitch above C3 in semitones, length in
 * steps.
 */
export const STEPS = 32;
export const PITCHES = 24;
export const LOW = 48; // MIDI C3
export const DEFAULT_BPM = 120;

export interface Note {
  step: number;
  /** Semitones above C3, 0 to 23. */
  pitch: number;
  len: number;
}

export interface Tune {
  bpm: number;
  notes: Note[];
}

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const pitchName = (pitch: number) => NAMES[pitch % 12] + (3 + Math.floor(pitch / 12));
export const isBlackKey = (pitch: number) => NAMES[pitch % 12].length === 2;
export const frequency = (pitch: number) => 440 * 2 ** ((LOW + pitch - 69) / 12);

const sortNotes = (notes: Note[]) => notes.sort((a, b) => a.step - b.step || a.pitch - b.pitch);

export function parseTune(text: string): Tune {
  const tune: Tune = { bpm: DEFAULT_BPM, notes: [] };
  if (!text) return tune;
  const dot = text.indexOf('.');
  if (dot < 0) return tune;
  const bpm = parseInt(text.slice(0, dot), 36);
  if (Number.isFinite(bpm)) tune.bpm = Math.min(300, Math.max(30, bpm));
  const body = text.slice(dot + 1);
  for (let i = 0; i + 2 < body.length; i += 3) {
    const [step, pitch, len] = [0, 1, 2].map((k) => parseInt(body[i + k], 36));
    if (![step, pitch, len].every(Number.isFinite) || step >= STEPS || pitch >= PITCHES || len < 1) continue;
    tune.notes.push({ step, pitch, len: Math.min(len, STEPS - step) });
  }
  sortNotes(tune.notes);
  return tune;
}

export function serializeTune(tune: Tune): string {
  if (!tune.notes.length && tune.bpm === DEFAULT_BPM) return '';
  const c = (n: number) => n.toString(36);
  return c(Math.round(tune.bpm)) + '.' + sortNotes(tune.notes.slice()).map((n) => c(n.step) + c(n.pitch) + c(Math.min(35, n.len))).join('');
}

/** Seconds per step: a step is a sixteenth note. */
export const stepSeconds = (bpm: number) => 60 / bpm / 4;
