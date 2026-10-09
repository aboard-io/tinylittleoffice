/**
 * Icons: Lucide's, as inline SVG. UI is the set the kit and the bars reach for; an app's own icon is a
 * Lucide node too (see AppDef.icon). LIBRARY is the starter set a document may name (":rocket Launch" in a
 * drawing or on a slide), by short name, drawn under node as well as in a browser; the rest of Lucide
 * joins it from the lazy chunk (icons-picker.ts) under Lucide's own kebab-case names. (A dependency, where
 * native has nothing: there is no icon API.)
 */
import { svg, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Calendar, Check, ChevronDown, Copy, Download, ExternalLink, Eye, FilePlus2,
  FileText, Folder, Globe, HardDrive, Heading1, Heading2, Highlighter, Image, IndentDecrease, IndentIncrease, Info, Italic,
  Languages, LayoutGrid, Link, List, ListOrdered, Menu, Moon, Pencil, Plus, Printer, QrCode, Redo2, Search, Share2, ShieldCheck,
  Smile, Strikethrough, Sun, SunMoon, Superscript, Table2, Trash2, Underline, Undo2, Unlink, X, LockOpen, ShieldX, KeyRound, Upload, Signature,
  // the starter library
  Rocket, Lightbulb, Target, TrendingUp, TrendingDown, BarChart3, PieChart, Users, User, Heart, Star, Flag, Mail, Phone, Clock,
  MapPin, Home, Building2, Briefcase, DollarSign, ShoppingCart, Gift, Coffee, Cloud, Zap, Flame, Leaf, Trees, Mountain, Car,
  Plane, Bike, Camera, Music, Book, Bookmark, GraduationCap, Megaphone, MessageCircle, Bell, Settings, Wrench, Hammer, Shield,
  Lock, Key, Compass, Map as MapIcon, Puzzle, Trophy, Award, Frown, ThumbsUp, ThumbsDown, AlertTriangle, CircleCheck, CircleX,
  HelpCircle, Package, Truck, Database, Server, Laptop, Smartphone, Scissors, Paintbrush, Palette, Film, Headphones, Gamepad2,
  Dumbbell, Apple, Pizza, Beer, Baby, Dog, Cat, Bird, Fish, Bug, Flower2,
  type IconNode,
} from 'lucide';

export type { IconNode };

export const UI = {
  alignCenter: AlignCenter, alignJustify: AlignJustify, alignLeft: AlignLeft, alignRight: AlignRight, bold: Bold, calendar: Calendar, check: Check,
  down: ChevronDown, copy: Copy, download: Download, open: ExternalLink, view: Eye, insert: FilePlus2, text: FileText, folder: Folder, globe: Globe,
  offline: HardDrive, heading1: Heading1, heading: Heading2, highlight: Highlighter, image: Image, outdent: IndentDecrease, indent: IndentIncrease,
  info: Info, italic: Italic, language: Languages, home: LayoutGrid, link: Link, list: List, listOrdered: ListOrdered, menu: Menu, moon: Moon,
  pen: Pencil, plus: Plus, print: Printer, qr: QrCode, redo: Redo2, search: Search, share: Share2, shield: ShieldCheck, icon: Smile,
  strike: Strikethrough, sun: Sun, auto: SunMoon, footnote: Superscript, table: Table2, trash: Trash2, underline: Underline, undo: Undo2,
  unlink: Unlink, close: X, lock: Lock, unlock: LockOpen, unsigned: Shield, mismatch: ShieldX, key: KeyRound, upload: Upload, sign: Signature,
} as const;

/**
 * The icons a document may name, by short name: the starter set, with keywords in icons-search.ts so they
 * can be suggested; every other Lucide icon joins under its own name once the full library has loaded.
 */
export const LIBRARY: Record<string, IconNode> = {
  rocket: Rocket, lightbulb: Lightbulb, target: Target, 'trending-up': TrendingUp, 'trending-down': TrendingDown,
  'bar-chart': BarChart3, 'pie-chart': PieChart, users: Users, user: User, heart: Heart, star: Star, flag: Flag,
  globe: Globe, mail: Mail, phone: Phone, calendar: Calendar, clock: Clock, 'map-pin': MapPin, home: Home,
  building: Building2, briefcase: Briefcase, dollar: DollarSign, cart: ShoppingCart, gift: Gift, coffee: Coffee,
  sun: Sun, moon: Moon, cloud: Cloud, zap: Zap, flame: Flame, leaf: Leaf, trees: Trees, mountain: Mountain,
  car: Car, plane: Plane, bike: Bike, camera: Camera, music: Music, book: Book, bookmark: Bookmark,
  graduation: GraduationCap, megaphone: Megaphone, message: MessageCircle, bell: Bell, settings: Settings,
  wrench: Wrench, hammer: Hammer, shield: Shield, lock: Lock, key: Key, search: Search, compass: Compass,
  map: MapIcon, idea: Lightbulb, puzzle: Puzzle, trophy: Trophy, award: Award, smile: Smile, frown: Frown,
  'thumbs-up': ThumbsUp, 'thumbs-down': ThumbsDown, warning: AlertTriangle, check: CircleCheck, x: CircleX,
  info: Info, help: HelpCircle, package: Package, truck: Truck, database: Database, server: Server,
  laptop: Laptop, phone2: Smartphone, printer: Printer, scissors: Scissors, brush: Paintbrush, palette: Palette,
  film: Film, headphones: Headphones, gamepad: Gamepad2, dumbbell: Dumbbell, apple: Apple, pizza: Pizza,
  beer: Beer, baby: Baby, dog: Dog, cat: Cat, bird: Bird, fish: Fish, bug: Bug, flower: Flower2,
};
/** The starter set's names, in order: what has keywords and can be suggested. */
export const LIBRARY_NAMES: readonly string[] = Object.keys(LIBRARY);

/** More icons by name (the full library, once loaded); a name already taken keeps its icon. */
export function addIcons(more: Record<string, IconNode>): string[] {
  const added: string[] = [];
  for (const [name, node] of Object.entries(more)) {
    if (name in LIBRARY) continue;
    LIBRARY[name] = node;
    added.push(name);
  }
  return added;
}

/** The icon a document names, or undefined while nothing goes by that name. */
export const iconNamed = (name: string): IconNode | undefined => LIBRARY[name];

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

/** An icon drawn into a picture (an SVG page), at x, y, `size` wide. A large one is drawn with a finer line. */
export const iconGlyph = (node: IconNode, x: number, y: number, size: number, color: string): string =>
  `<g transform="translate(${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}) scale(${Math.round((size / 24) * 1000) / 1000})" fill="none" stroke="${color}" stroke-width="${size > 40 ? 1.6 : 2}" stroke-linecap="round" stroke-linejoin="round">${iconInner(node)}</g>`;

/** An icon by name, drawn into a picture; '' for a name nothing goes by. */
export const glyphNamed = (name: string, x: number, y: number, size: number, color: string): string => {
  const node = iconNamed(name);
  return node ? iconGlyph(node, x, y, size, color) : '';
};
