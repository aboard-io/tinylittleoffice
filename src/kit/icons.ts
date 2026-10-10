/**
 * Icons: Lucide's, as inline SVG. UI is the set the kit and the bars reach for; an app's own icon is a
 * Lucide node too (see AppDef.icon). (A dependency, where native has nothing: there is no icon API.)
 *
 * A document may name any Lucide icon; the starter set draws at once, the rest after one lazy load.
 * LIBRARY is the starter set (":rocket Launch" in a drawing, ":rocket:" in words), by short name, drawn
 * under node as well as in a browser; the rest of Lucide joins it from one lazy chunk (icons-full.ts, which
 * the picker brings too) under Lucide's own kebab-case names. loadIcons() fetches that chunk once;
 * onIcons() tells whoever drew a name it did not know yet (<to-text> draws again); ensureIcons(names) is
 * what a caller awaits before drawing a view or an export that names an icon the starter set lacks
 * (iconNames(doc) lists what a document names). A view itself stays synchronous.
 */
import { svg, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FilePlus2,
  FileText,
  Folder,
  Globe,
  HardDrive,
  Heading1,
  Heading2,
  Highlighter,
  Image,
  IndentDecrease,
  IndentIncrease,
  Info,
  Italic,
  Keyboard,
  Languages,
  LayoutGrid,
  Link,
  List,
  ListOrdered,
  Menu,
  Minus,
  Moon,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Redo2,
  Search,
  Share2,
  ShieldCheck,
  Smile,
  Strikethrough,
  Sun,
  SunMoon,
  Superscript,
  Table2,
  Trash2,
  Underline,
  Undo2,
  Unlink,
  X,
  LockOpen,
  ShieldX,
  KeyRound,
  ShieldQuestionMark,
  Upload,
  Signature,
  GitCompare,
  Code,
  FolderOpen,
  Play,
  Send,
  // the starter library
  Rocket,
  Lightbulb,
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Users,
  User,
  Heart,
  Star,
  Flag,
  Mail,
  Phone,
  Clock,
  MapPin,
  Home,
  Building2,
  Briefcase,
  DollarSign,
  ShoppingCart,
  Gift,
  Coffee,
  Cloud,
  Zap,
  Flame,
  Leaf,
  Trees,
  Mountain,
  Car,
  Plane,
  Bike,
  Camera,
  Music,
  Book,
  Bookmark,
  GraduationCap,
  Megaphone,
  MessageCircle,
  Bell,
  Settings,
  Wrench,
  Hammer,
  Shield,
  Lock,
  Key,
  Compass,
  Map as MapIcon,
  Puzzle,
  Trophy,
  Award,
  Frown,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  CircleCheck,
  CircleX,
  HelpCircle,
  Package,
  Truck,
  Database,
  Server,
  Laptop,
  Smartphone,
  Scissors,
  Paintbrush,
  Palette,
  Film,
  Headphones,
  Gamepad2,
  Dumbbell,
  Apple,
  Pizza,
  Beer,
  Baby,
  Dog,
  Cat,
  Bird,
  Fish,
  Bug,
  Flower2,
  type IconNode,
} from 'lucide';

export type { IconNode };

export const UI = {
  alignCenter: AlignCenter,
  alignJustify: AlignJustify,
  alignLeft: AlignLeft,
  alignRight: AlignRight,
  bold: Bold,
  calendar: Calendar,
  check: Check,
  down: ChevronDown,
  up: ChevronUp,
  keys: Keyboard,
  minus: Minus,
  play: Play,
  copy: Copy,
  download: Download,
  open: ExternalLink,
  view: Eye,
  insert: FilePlus2,
  text: FileText,
  folder: Folder,
  globe: Globe,
  device: HardDrive,
  heading1: Heading1,
  heading: Heading2,
  highlight: Highlighter,
  image: Image,
  outdent: IndentDecrease,
  indent: IndentIncrease,
  info: Info,
  italic: Italic,
  language: Languages,
  home: LayoutGrid,
  link: Link,
  list: List,
  listOrdered: ListOrdered,
  menu: Menu,
  moon: Moon,
  pen: Pencil,
  plus: Plus,
  print: Printer,
  qr: QrCode,
  redo: Redo2,
  search: Search,
  share: Share2,
  shield: ShieldCheck,
  icon: Smile,
  strike: Strikethrough,
  sun: Sun,
  auto: SunMoon,
  footnote: Superscript,
  table: Table2,
  trash: Trash2,
  underline: Underline,
  undo: Undo2,
  unlink: Unlink,
  close: X,
  lock: Lock,
  unlock: LockOpen,
  unsigned: Shield,
  mismatch: ShieldX,
  unchecked: ShieldQuestionMark,
  key: KeyRound,
  upload: Upload,
  sign: Signature,
  compare: GitCompare,
  code: Code,
  openFile: FolderOpen,
  mail: Mail,
  post: Send,
} as const;

/**
 * The icons a document may name, by short name: the starter set, with keywords in icons-search.ts so they
 * can be suggested; every other Lucide icon joins under its own name once the full library has loaded.
 */
export const LIBRARY: Record<string, IconNode> = {
  rocket: Rocket,
  lightbulb: Lightbulb,
  target: Target,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'bar-chart': BarChart3,
  'pie-chart': PieChart,
  users: Users,
  user: User,
  heart: Heart,
  star: Star,
  flag: Flag,
  globe: Globe,
  mail: Mail,
  phone: Phone,
  calendar: Calendar,
  clock: Clock,
  'map-pin': MapPin,
  home: Home,
  building: Building2,
  briefcase: Briefcase,
  dollar: DollarSign,
  cart: ShoppingCart,
  gift: Gift,
  coffee: Coffee,
  sun: Sun,
  moon: Moon,
  cloud: Cloud,
  zap: Zap,
  flame: Flame,
  leaf: Leaf,
  trees: Trees,
  mountain: Mountain,
  car: Car,
  plane: Plane,
  bike: Bike,
  camera: Camera,
  music: Music,
  book: Book,
  bookmark: Bookmark,
  graduation: GraduationCap,
  megaphone: Megaphone,
  message: MessageCircle,
  bell: Bell,
  settings: Settings,
  wrench: Wrench,
  hammer: Hammer,
  shield: Shield,
  lock: Lock,
  key: Key,
  search: Search,
  compass: Compass,
  map: MapIcon,
  idea: Lightbulb,
  puzzle: Puzzle,
  trophy: Trophy,
  award: Award,
  smile: Smile,
  frown: Frown,
  'thumbs-up': ThumbsUp,
  'thumbs-down': ThumbsDown,
  warning: AlertTriangle,
  check: CircleCheck,
  x: CircleX,
  info: Info,
  help: HelpCircle,
  package: Package,
  truck: Truck,
  database: Database,
  server: Server,
  laptop: Laptop,
  phone2: Smartphone,
  printer: Printer,
  scissors: Scissors,
  brush: Paintbrush,
  palette: Palette,
  film: Film,
  headphones: Headphones,
  gamepad: Gamepad2,
  dumbbell: Dumbbell,
  apple: Apple,
  pizza: Pizza,
  beer: Beer,
  baby: Baby,
  dog: Dog,
  cat: Cat,
  bird: Bird,
  fish: Fish,
  bug: Bug,
  flower: Flower2,
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

/* ---------- the rest of Lucide, once ---------- */

let full: Promise<void> | null = null;
let joined = false;
const listeners = new Set<() => void>();

/** Called by icons-full.ts once the whole of Lucide has joined LIBRARY: everyone waiting draws again. */
export function fullJoined() {
  if (joined) return;
  joined = true;
  for (const f of [...listeners]) f();
}
/** Whether the whole of Lucide has joined (a name unknown now is unknown for good). */
export const iconsComplete = () => joined;
/** The whole of Lucide, loaded once (a lazy chunk); resolves when it has joined, never rejects (offline, the names stay names). */
export function loadIcons(): Promise<void> {
  if (joined) return Promise.resolve();
  return (full ??= import('./icons-full.ts').then(
    () => fullJoined(),
    () => void (full = null),
  ));
}
/** Told once the whole of Lucide has joined; returns the way to stop listening. */
export function onIcons(f: () => void): () => void {
  listeners.add(f);
  return () => void listeners.delete(f);
}
/** Every name known, loading the rest of Lucide first when one is not: resolves at once when they all are. */
export function ensureIcons(names: Iterable<string>): Promise<void> {
  if (joined) return Promise.resolve();
  for (const n of names) if (!(n in LIBRARY)) return loadIcons();
  return Promise.resolve();
}
/**
 * The icon names a document's text holds, each once: ":name:" in words, ":name" at the start of a label (a
 * drawing's shape). A colon after a letter or digit ("10:30", "a:b") is not one. Generous on purpose: a word
 * read as a name only costs a lazy load.
 */
export function iconNames(doc: string): string[] {
  const out = new Set<string>();
  for (const m of doc.matchAll(/(?<![A-Za-z0-9]):([a-z][a-z0-9-]*)(?=:|\s|$)/gm)) out.add(m[1]);
  return [...out];
}

/** Whether what the picker gave is an icon's name ("car-front") rather than an emoji's character. */
export const isIconName = (s: string): boolean => /^[a-z][a-z0-9-]*$/.test(s);

/** The icon a document names, or undefined while nothing goes by that name. */
export const iconNamed = (name: string): IconNode | undefined => LIBRARY[name];

function attrs(a: Record<string, string | number | undefined>): string {
  return Object.entries(a)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
    .join(' ');
}

/** Inner markup (paths etc.) of an icon, for any <svg>: written once per icon. */
const inners = new WeakMap<IconNode, string>();
export const iconInner = (node: IconNode): string => {
  let inner = inners.get(node);
  if (inner === undefined) inners.set(node, (inner = node.map(([tag, a]) => `<${tag} ${attrs(a)}/>`).join('')));
  return inner;
};

/**
 * A complete inline <svg> for an icon, decorative (its button or line carries the words): made once per icon, size and
 * class, as a bar is drawn again and again. `size` is in the stylesheet's sixteenths of the scale the icon is under (--i,
 * kit.css's .to-icon): the nav's inside the nav, the document's in the document.
 */
const drawn = new WeakMap<IconNode, Map<string, TemplateResult>>();
export function icon(node: IconNode, size = 20, cls = ''): TemplateResult {
  let sizes = drawn.get(node);
  if (!sizes) drawn.set(node, (sizes = new Map()));
  const key = `${size} ${cls}`;
  let made = sizes.get(key);
  if (!made) {
    made = svg`<svg xmlns="http://www.w3.org/2000/svg" width=${size} height=${size} style=${`--i:${size / 16}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="to-icon ${cls}" aria-hidden="true">${unsafeSVG(iconInner(node))}</svg>`;
    sizes.set(key, made);
  }
  return made;
}

/** An icon drawn into a picture (an SVG page), at x, y, `size` wide. A large one is drawn with a finer line. */
export const iconGlyph = (node: IconNode, x: number, y: number, size: number, color: string): string =>
  `<g transform="translate(${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}) scale(${Math.round((size / 24) * 1000) / 1000})" fill="none" stroke="${color}" stroke-width="${size > 40 ? 1.6 : 2}" stroke-linecap="round" stroke-linejoin="round">${iconInner(node)}</g>`;

/** An icon by name, drawn into a picture; '' for a name nothing goes by. */
export const glyphNamed = (name: string, x: number, y: number, size: number, color: string): string => {
  const node = iconNamed(name);
  return node ? iconGlyph(node, x, y, size, color) : '';
};
