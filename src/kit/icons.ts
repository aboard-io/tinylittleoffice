/**
 * Icons: Lucide's, as inline SVG. UI is the set the kit and the bars reach for; an app's own icon is a
 * Lucide node too (see AppDef.icon). (A dependency, where native has nothing: there is no icon API.)
 */
import { svg, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Calendar, Check, ChevronDown, Copy, Download, ExternalLink, FilePlus2, FileText,
  Folder, Globe, HardDrive, Heading1, Heading2, Highlighter, Image, IndentDecrease, IndentIncrease, Info, Italic, Languages, LayoutGrid,
  Link, List, ListOrdered, Menu, Moon, Pencil, Plus, Printer, QrCode, Redo2, Search, Share2, ShieldCheck, Smile, Strikethrough, Sun,
  SunMoon, Superscript, Table2, Trash2, Underline, Undo2, Unlink, X,
  type IconNode,
} from 'lucide';

export type { IconNode };

export const UI = {
  alignCenter: AlignCenter, alignJustify: AlignJustify, alignLeft: AlignLeft, alignRight: AlignRight, bold: Bold, calendar: Calendar, check: Check,
  down: ChevronDown, copy: Copy, download: Download, open: ExternalLink, insert: FilePlus2, text: FileText, folder: Folder, globe: Globe,
  offline: HardDrive, heading1: Heading1, heading: Heading2, highlight: Highlighter, image: Image, outdent: IndentDecrease, indent: IndentIncrease,
  info: Info, italic: Italic, language: Languages, home: LayoutGrid, link: Link, list: List, listOrdered: ListOrdered, menu: Menu, moon: Moon,
  pen: Pencil, plus: Plus, print: Printer, qr: QrCode, redo: Redo2, search: Search, share: Share2, shield: ShieldCheck, icon: Smile,
  strike: Strikethrough, sun: Sun, auto: SunMoon, footnote: Superscript, table: Table2, trash: Trash2, underline: Underline, undo: Undo2,
  unlink: Unlink, close: X,
} as const;

function attrs(a: Record<string, string | number | undefined>): string {
  return Object.entries(a)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
    .join(' ');
}

/** Inner markup (paths etc.) of an icon, for any <svg>. */
export const iconInner = (node: IconNode): string => node.map(([tag, a]) => `<${tag} ${attrs(a)}/>`).join('');

/** A complete inline <svg> for an icon, decorative (its button or line carries the words). */
export function icon(node: IconNode, size = 20, cls = ''): TemplateResult {
  return svg`<svg xmlns="http://www.w3.org/2000/svg" width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="to-icon ${cls}" aria-hidden="true">${unsafeSVG(iconInner(node))}</svg>`;
}

/** An icon drawn into a picture (an SVG page), at x, y, `size` wide. */
export const iconGlyph = (node: IconNode, x: number, y: number, size: number, color: string): string =>
  `<g transform="translate(${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}) scale(${Math.round((size / 24) * 1000) / 1000})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconInner(node)}</g>`;
