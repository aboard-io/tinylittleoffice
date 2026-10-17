/**
 * How a deck looks: the paper, the ink, the accent (bullets, icons, links) and something drawn behind every
 * slide. A deck says which in its header ("theme: midnight"); the plain white one is the default. Every
 * colour is a hex, so tests/theme.unit.test.ts can hold each theme's ink to 4.5:1 on its paper and its
 * accent to 3:1 (the contrast test's floors). A decoration is drawn for the page it is on (a slide's 960 by 600,
 * a poster, a booklet's page): it keeps to that page's edges, clear of the words, and is never stretched.
 */
import { ACCENT, INK, MUTED } from '../../kit/draw/draw.ts';
import { t } from '../../kit/core/i18n.ts';

export interface DeckTheme {
  name: () => string;
  /** Playful rather than businesslike: listed apart. */
  fun?: boolean;
  /** Light words on a dark slide: a document shown on it gets a white card. */
  dark?: boolean;
  paper: string;
  ink: string;
  /** A title slide's subtitle, the footnotes. */
  muted: string;
  /** Bullets, icons. */
  accent: string;
  /** Links, where the accent is too faint to read as words. */
  link?: string;
  /** SVG drawn behind everything, for a page w by h (a slide is 960 by 600). */
  deco?: (w: number, h: number) => string;
}

/** Pieces of confetti: x, y, colour, shape (o circle, s square, t triangle), turn. */
const CONFETTI: [number, number, string, string, number][] = [
  [28, 40, '#f472b6', 'o', 0],
  [80, 22, '#facc15', 's', 20],
  [150, 30, '#38bdf8', 't', 10],
  [880, 26, '#34d399', 'o', 0],
  [930, 60, '#f472b6', 's', 35],
  [910, 130, '#a78bfa', 't', -15],
  [24, 140, '#34d399', 's', 15],
  [40, 300, '#fb923c', 'o', 0],
  [22, 470, '#a78bfa', 'o', 0],
  [60, 570, '#38bdf8', 's', -20],
  [180, 578, '#f472b6', 't', 25],
  [470, 582, '#facc15', 'o', 0],
  [700, 576, '#34d399', 't', -30],
  [850, 570, '#fb923c', 's', 10],
  [932, 520, '#38bdf8', 'o', 0],
  [938, 330, '#facc15', 't', 40],
];
/** Where a piece lands on a page w by h: near an edge, as far from that edge as on the slide; elsewhere, as far across. */
const scatter = (v: number, size: number, full: number) => (v < 200 ? v : v > full - 200 ? size - (full - v) : Math.round((v * size) / full));
const piece =
  (w: number, h: number) =>
  ([cx, cy, c, k, turn]: (typeof CONFETTI)[number]) => {
    const [x, y] = [scatter(cx, w, 960), scatter(cy, h, 600)];
    return k === 'o'
      ? `<circle cx="${x}" cy="${y}" r="7" fill="${c}"/>`
      : `<g transform="translate(${x} ${y}) rotate(${turn})" fill="${c}">${k === 's' ? '<rect x="-6" y="-6" width="12" height="12" rx="2"/>' : '<path d="M0 -8 L7 6 L-7 6 Z"/>'}</g>`;
  };

/** A band of waves across a page w wide, its crest at y, down to the foot h. */
const wave = (w: number, h: number, y: number, fill: string, shift = 0) =>
  `<path d="M${-shift} ${y} q60 -18 120 0${' t120 0'.repeat(Math.max(9, Math.ceil((w + shift) / 120)) - 1)} V${h} H${-shift} Z" fill="${fill}"/>`;

/** The eleven themes, the plain one first; the key is what the header says. */
export const THEMES: Record<string, DeckTheme> = {
  '': { name: () => t('deck-plain'), paper: '#ffffff', ink: INK, muted: MUTED, accent: ACCENT },
  boardroom: {
    name: () => t('deck-boardroom'),
    paper: '#ffffff',
    ink: '#0f172a',
    muted: '#475569',
    accent: '#1d4ed8',
    deco: (_w, h) => `<rect width="18" height="${h}" fill="#1e3a8a"/><rect x="18" width="5" height="${h}" fill="#60a5fa"/>`,
  },
  ivory: {
    name: () => t('deck-ivory'),
    paper: '#fbf8f1',
    ink: '#1c1917',
    muted: '#57534e',
    accent: '#9a3412',
    deco: (w, h) => `<rect x="64" y="30" width="${w - 128}" height="2" fill="#1c1917"/><rect x="64" y="${h - 32}" width="${w - 128}" height="1" fill="#1c1917"/>`,
  },
  midnight: {
    name: () => t('deck-midnight'),
    dark: true,
    paper: '#0b1220',
    ink: '#f1f5f9',
    muted: '#cbd5e1',
    accent: '#38bdf8',
    deco: (_w, h) => `<rect x="64" y="${h - 36}" width="120" height="4" rx="2" fill="#38bdf8"/>`,
  },
  graphite: {
    name: () => t('deck-graphite'),
    dark: true,
    paper: '#1c1c1e',
    ink: '#fafafa',
    muted: '#d4d4d8',
    accent: '#a3e635',
    deco: (w) => `<rect x="${w - 60}" y="28" width="32" height="32" rx="4" fill="#a3e635"/>`,
  },
  confetti: { name: () => t('deck-confetti'), fun: true, paper: '#fffdf7', ink: '#1f2937', muted: '#4b5563', accent: '#db2777', link: '#be185d', deco: (w, h) => CONFETTI.map(piece(w, h)).join('') },
  sunset: {
    name: () => t('deck-sunset'),
    fun: true,
    paper: '#fff7ed',
    ink: '#431407',
    muted: '#7c2d12',
    accent: '#ea580c',
    link: '#c2410c',
    deco: (w, h) =>
      `<circle cx="${w - 30}" cy="${h + 50}" r="200" fill="#fdba74" opacity=".55"/><circle cx="${w + 15}" cy="${h + 10}" r="120" fill="#fb7185" opacity=".5"/><circle cx="-20" cy="-30" r="90" fill="#fde68a" opacity=".7"/>`,
  },
  ocean: {
    name: () => t('deck-ocean'),
    fun: true,
    paper: '#f0f9ff',
    ink: '#0c4a6e',
    muted: '#075985',
    accent: '#0284c7',
    link: '#0369a1',
    deco: (w, h) => wave(w, h, h - 34, '#bae6fd') + wave(w, h, h - 18, '#7dd3fc', 60),
  },
  bubblegum: {
    name: () => t('deck-bubblegum'),
    fun: true,
    paper: '#fdf2f8',
    ink: '#500724',
    muted: '#831843',
    accent: '#c026d3',
    link: '#a21caf',
    deco: (w, h) =>
      `<circle cx="-30" cy="-30" r="115" fill="#f9a8d4" opacity=".55"/><circle cx="${w + 35}" cy="${h + 35}" r="160" fill="#d8b4fe" opacity=".55"/><circle cx="${w - 40}" cy="70" r="22" fill="#f9a8d4" opacity=".7"/>`,
  },
  arcade: {
    name: () => t('deck-arcade'),
    fun: true,
    dark: true,
    paper: '#1e1b4b',
    ink: '#faf5ff',
    muted: '#e9d5ff',
    accent: '#f472b6',
    deco: (w, h) =>
      `<rect y="${h - 38}" width="${w}" height="7" fill="#f472b6"/><rect y="${h - 26}" width="${w}" height="7" fill="#22d3ee"/><rect y="${h - 14}" width="${w}" height="7" fill="#facc15"/>`,
  },
  chalkboard: {
    name: () => t('deck-chalkboard'),
    fun: true,
    dark: true,
    paper: '#1f3b2d',
    ink: '#f5f5f4',
    muted: '#d6d3d1',
    accent: '#fde047',
    deco: (w, h) =>
      `<rect x="6" y="6" width="${w - 12}" height="${h - 12}" fill="none" stroke="#92400e" stroke-width="12"/><rect x="12" y="12" width="${w - 24}" height="${h - 24}" fill="none" stroke="#78350f" stroke-width="2"/>`,
  },
};

export const themeOf = (id = ''): DeckTheme => (Object.hasOwn(THEMES, id) ? THEMES[id] : THEMES['']);

/** The colours a deck's icons can be, besides the theme's accent: the header says the name ("color: red"). */
export const ICON_COLORS: Record<string, { name: () => string; hex: string }> = {
  black: { name: () => t('common-black'), hex: '#18181b' },
  red: { name: () => t('common-red'), hex: '#dc2626' },
  orange: { name: () => t('common-orange'), hex: '#ea580c' },
  green: { name: () => t('common-green'), hex: '#16a34a' },
  blue: { name: () => t('common-blue'), hex: '#2563eb' },
  purple: { name: () => t('common-purple'), hex: '#9333ea' },
};

/* ---------- contrast, for the tests ---------- */

const channel = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
const luminance = (hex: string) => [0.2126, 0.7152, 0.0722].reduce((sum, w, i) => sum + w * (channel(hex, i) <= 0.03928 ? channel(hex, i) / 12.92 : ((channel(hex, i) + 0.055) / 1.055) ** 2.4), 0);
/** WCAG contrast between two hex colours. */
export function contrast(a: string, b: string): number {
  const la = luminance(a),
    lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
