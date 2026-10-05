/**
 * Lucide icons. UI icons are used in toolbars; LIBRARY is the curated set
 * offered to deck slides and drawings, keyed by Lucide's kebab-case names.
 */
import { svg, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { addIconNames } from './iconsearch.ts';
import {
  Bold, Italic, Underline, Strikethrough, Heading1, Heading2, List, ListOrdered, Pilcrow,
  Table2, FileText, Presentation, PenTool, Plus, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Copy, Link, Play, X, MousePointer2, Square, Circle, Diamond, Minus, MoveRight, Type,
  ArrowUpToLine, ArrowDownToLine, Check, Sparkles, CalendarDays, Menu, ShieldCheck, ShieldAlert, KeyRound, LayoutGrid, LockKeyhole, LockKeyholeOpen, SquareFunction, FoldHorizontal, UnfoldHorizontal, Download,
  ListTodo, SquareKanban, ChartGantt, Route, Clapperboard, Share2, Ellipsis, ZoomIn, ZoomOut, Pause, Square as StopSquare, Maximize, Image as ImageIcon, Send, Repeat, Navigation, Spline, Network, Workflow, Brain, Rows3, CircleDot, DatabaseZap, StickyNote, CircleHelp, BookOpen, Folder, Waves, Grid2x2, DoorOpen, Armchair, Milestone, Grid3x3, Signpost, MapPinned, PencilLine, Dices, Layers, Vote, Hourglass, HandCoins, CalendarCheck, Timer, AtSign, ListChecks, Library, Guitar, BookCopy, ScrollText, Columns3, MessagesSquare, NotebookPen, Utensils, FileUser, IdCard, ChefHat, PanelsTopLeft, Store, ReceiptText, FileSignature, SunMoon, Undo2, Redo2, Pencil, Keyboard, IndentIncrease, IndentDecrease, Columns2, ChartColumn, FilePlus2,
  // library
  Rocket, Lightbulb, Target, TrendingUp, TrendingDown, BarChart3, PieChart, Users, User, Heart, Star,
  Flag, Globe, Mail, Phone, Calendar, Clock, MapPin, Home, Building2, Briefcase, DollarSign,
  ShoppingCart, Gift, Coffee, Sun, Moon, Cloud, Zap, Flame, Leaf, Trees, Mountain, Car, Plane, Bike,
  Camera, Music, Book, Bookmark, GraduationCap, Megaphone, MessageCircle, Bell, Settings, Wrench,
  Hammer, Shield, Lock, Key, Search, Compass, Map as MapIcon, Lightbulb as Idea, Puzzle, Trophy, Award,
  Smile, Frown, ThumbsUp, ThumbsDown, AlertTriangle, CircleCheck, CircleX, Info, HelpCircle, Package,
  Truck, Database, Server, Laptop, Smartphone, Printer, Scissors, Paintbrush, Palette, Film,
  Headphones, Gamepad2, Dumbbell, Apple, Pizza, Beer, Baby, Dog, Cat, Bird, Fish, Bug, Flower2,
  type IconNode,
} from 'lucide';

export const UI = {
  bold: Bold, italic: Italic, underline: Underline, strike: Strikethrough, h1: Heading1, h2: Heading2,
  ul: List, ol: ListOrdered, p: Pilcrow, sheet: Table2, write: FileText, deck: Presentation, draw: PenTool,
  plus: Plus, trash: Trash2, left: ChevronLeft, right: ChevronRight, up: ChevronUp, down: ChevronDown,
  copy: Copy, link: Link, play: Play, close: X, select: MousePointer2, rect: Square, ellipse: Circle,
  diamond: Diamond, line: Minus, arrow: MoveRight, text: Type, front: ArrowUpToLine, back: ArrowDownToLine,
  check: Check, sparkles: Sparkles, globe: Globe, cal: CalendarDays, menu: Menu, shield: ShieldCheck, shieldOff: ShieldAlert,
  key: KeyRound, info: Info, clock: Clock, home: LayoutGrid, lock: LockKeyhole, unlock: LockKeyholeOpen,
  fn: SquareFunction, fit: FoldHorizontal, expand: UnfoldHorizontal, download: Download,
  todo: ListTodo, board: SquareKanban, gantt: ChartGantt, trip: Route, anim: Clapperboard, share: Share2, more: Ellipsis,
  zoomIn: ZoomIn, zoomOut: ZoomOut, pause: Pause, stop: StopSquare, frame: Maximize, image: ImageIcon, send: Send, repeat: Repeat, star: Star, smile: Smile,
  zine: BookOpen, folder: Folder, flow: Waves, pixel: Grid2x2, pattern: Scissors, floor: DoorOpen, seating: Armchair, family: Users, timeline: Milestone, wordsearch: Grid3x3, adventure: Signpost, hunt: MapPinned, trivia: Trophy, madlibs: PencilLine, spinner: Dices, flashcards: Layers, poll: Vote, santa: Gift, card: Heart, capsule: Hourglass, split: HandCoins, habits: CalendarCheck, countdown: Timer, bio: AtSign, checklist: ListChecks, log: Dumbbell, reading: Library, chords: Guitar, booklet: BookCopy, programme: ScrollText, brochure: Columns3, comic: MessagesSquare, planner: NotebookPen, poster: Megaphone, certificate: Award, menucard: Utensils, resume: FileUser, badges: IdCard, recipes: ChefHat, printer: Printer, sticky: StickyNote, faq: CircleHelp, site: PanelsTopLeft, store: Store, invoice: ReceiptText, contract: FileSignature, join: Spline, org: Network, lanes: Rows3, mind: Brain, venn: CircleDot, net: Workflow, db: DatabaseZap, pin: MapPin, search: Search, locate: Navigation, sun: Sun, moon: Moon, auto: SunMoon, undo: Undo2, redo: Redo2, pen: Pencil, keys: Keyboard, indent: IndentIncrease, outdent: IndentDecrease, columns: Columns2, chart: ChartColumn, insert: FilePlus2,
} as const;

export const LIBRARY: Record<string, IconNode> = {
  rocket: Rocket, lightbulb: Lightbulb, target: Target, 'trending-up': TrendingUp, 'trending-down': TrendingDown,
  'bar-chart': BarChart3, 'pie-chart': PieChart, users: Users, user: User, heart: Heart, star: Star, flag: Flag,
  globe: Globe, mail: Mail, phone: Phone, calendar: Calendar, clock: Clock, 'map-pin': MapPin, home: Home,
  building: Building2, briefcase: Briefcase, dollar: DollarSign, cart: ShoppingCart, gift: Gift, coffee: Coffee,
  sun: Sun, moon: Moon, cloud: Cloud, zap: Zap, flame: Flame, leaf: Leaf, trees: Trees, mountain: Mountain,
  car: Car, plane: Plane, bike: Bike, camera: Camera, music: Music, book: Book, bookmark: Bookmark,
  graduation: GraduationCap, megaphone: Megaphone, message: MessageCircle, bell: Bell, settings: Settings,
  wrench: Wrench, hammer: Hammer, shield: Shield, lock: Lock, key: Key, search: Search, compass: Compass,
  map: MapIcon, idea: Idea, puzzle: Puzzle, trophy: Trophy, award: Award, smile: Smile, frown: Frown,
  'thumbs-up': ThumbsUp, 'thumbs-down': ThumbsDown, warning: AlertTriangle, check: CircleCheck, x: CircleX,
  info: Info, help: HelpCircle, package: Package, truck: Truck, database: Database, server: Server,
  laptop: Laptop, phone2: Smartphone, printer: Printer, scissors: Scissors, brush: Paintbrush, palette: Palette,
  film: Film, headphones: Headphones, gamepad: Gamepad2, dumbbell: Dumbbell, apple: Apple, pizza: Pizza,
  beer: Beer, baby: Baby, dog: Dog, cat: Cat, bird: Bird, fish: Fish, bug: Bug, flower: Flower2,
};

/** The icons that have keywords and can be suggested. (Every other Lucide icon is found by its name.) */
export const LIBRARY_NAMES = Object.keys(LIBRARY);

function attrs(a: Record<string, string | number>): string {
  return Object.entries(a)
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
    .join(' ');
}

/** Inner markup (paths etc.) of a Lucide icon, for embedding in any <svg>. */
export function iconInner(node: IconNode): string {
  return node.map(([tag, a]) => `<${tag} ${attrs(a)}/>`).join('');
}

/** A complete inline <svg> for a Lucide icon. */
export function icon(node: IconNode, size = 16, extra = ''): TemplateResult {
  const inner = iconInner(node);
  return svg`<svg xmlns="http://www.w3.org/2000/svg" width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide ${extra}" aria-hidden="true">${unsafeSVG(inner)}</svg>`;
}

export function libraryIcon(name: string, size = 16): TemplateResult | '' {
  const node = LIBRARY[name];
  return node ? icon(node, size) : '';
}

/** Every library icon as SVG markup (24 by 24, stroked), for drawing documents. */
export const ICON_SVG: Record<string, string> = Object.fromEntries(Object.entries(LIBRARY).map(([name, node]) => [name, iconInner(node)]));

/**
 * The rest of Lucide (some 1,800 icons), fetched after the page is up so it
 * costs nothing to start. Each joins LIBRARY and ICON_SVG under its Lucide
 * name ("chart-column", "building-2"); the short names above keep working.
 */
export const allIcons: Promise<void> = import('./icons-all.ts').then(({ icons }) => {
  const added: string[] = [];
  for (const [name, node] of Object.entries(icons)) {
    const id = name.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').replace(/([a-z])([A-Z0-9])/g, '$1-$2').replace(/([0-9])([A-Z])/g, '$1-$2').toLowerCase();
    if (id in LIBRARY) continue;
    LIBRARY[id] = node;
    ICON_SVG[id] = iconInner(node);
    added.push(id);
  }
  addIconNames(added);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('to-refresh'));
});
