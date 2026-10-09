/**
 * Icons: Lucide's, as inline SVG. UI is the set the kit and the bars reach for; an app's own icon is a
 * Lucide node too (see AppDef.icon). (A dependency, where native has nothing: there is no icon API.)
 */
import { svg, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import {
  Bold, Check, ChevronDown, Copy, Download, FilePlus2, FileText, Folder, Globe, HardDrive, Heading2, Image, Info, Italic, Languages,
  LayoutGrid, Link, List, Menu, Moon, Plus, Printer, QrCode, Redo2, Search, Share2, ShieldCheck, Sun, SunMoon, Table2, Undo2, X,
  type IconNode,
} from 'lucide';

export type { IconNode };

export const UI = {
  bold: Bold, check: Check, down: ChevronDown, copy: Copy, download: Download, insert: FilePlus2, text: FileText, folder: Folder, globe: Globe,
  offline: HardDrive, heading: Heading2, image: Image, info: Info, italic: Italic, language: Languages, home: LayoutGrid, link: Link, list: List,
  menu: Menu, moon: Moon, plus: Plus, print: Printer, qr: QrCode, redo: Redo2, search: Search, share: Share2, shield: ShieldCheck, sun: Sun,
  auto: SunMoon, table: Table2, undo: Undo2, close: X,
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
