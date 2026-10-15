/**
 * <to-trip-editor>: the Trip app. A map (MapLibre on OpenFreeMap, imported lazily) above the stops, beside them when
 * there is room. A tap on the map adds a stop there (after the stop in hand); a pin dragged moves its stop, and a
 * focused pin is nudged by the arrows; Insert ▾ finds a place by name (OpenStreetMap's Nominatim, asked only when
 * Search is tapped) or puts a stop at the map's middle. Each stop is a row: its number (the handle: a tap chooses
 * the stop, a drag carries it), its name and note (one-line <to-text>s over the table's plain cells).
 *
 * The words follow docs/editing.md §6: Enter in the name goes to the note, Enter in the note asks for the next
 * stop by name; Backspace in an empty stop takes it away; Up/Down go from stop to stop, Alt+Up/Down move the stop
 * and Mod+D duplicates it, the caret kept where it was. Stops are rows of the kit's rows.ts: a tap on the number,
 * Escape or Shift+Up/Down in the words choose them whole, and chosen stops are moved, duplicated, copied (TLO and
 * our HTML), cut, pasted and deleted from the keys or the bar under them. The map keeps its own wheel and pinch
 * (§8), and a double tap on it zooms without adding a stop. Every edit carries where the caret or the chosen stops
 * were, so an undo puts them back. The bar holds Insert ▾, the units, whether the stops are a route or dots, the
 * whole route in view, the map on or off, and ends with undo and redo.
 *
 * Present (Mod+Alt+Enter, or the bar's button) gives the map the whole screen and flies it from stop to stop,
 * one a click (Space, the right arrow), each named with its note and the leg to it; Escape ends (as a slide
 * that holds a trip builds a stop a step: AppDef.steps).
 *
 * This is the one app that talks to the network by itself: while the map is on view its pictures come from
 * tile.openstreetmap.org (and, by the same Map switch, under a trip drawn anywhere: view.ts). The route itself lives only in the link. A trip with no stops opens on the country of the
 * site's language (home.ts: the browser's own region overriding it, New York City where neither says), never on the
 * whole world. Where I am, in the bar, asks the browser where the device is (once a tap, no watching, 5 s at most)
 * and centers the map there at a city's zoom; refused or unknown, the map goes to that country. The position is used
 * for that and nothing else: it is never written into the document or kept anywhere. Every change is operations on
 * the document's table (model.ts).
 */
import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import type * as ML from 'maplibre-gl';
import mapWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { applyAll, parse, plainText, write, type Block, type Doc, type Op } from '../../doc/index.ts';
import { cmdMenu, cmdTool } from '../../kit/ui/bar.ts';
import { drawnIn, runKey } from '../../kit/core/commands.ts';
import TRIP, { AT } from './commands.ts';
import { clipText, docToHtml, GENERATOR, htmlToBlocks } from '../../kit/text/clipboard.ts';
import { DocElement, type Entry } from '../../kit/core/element.ts';
import { icon, UI } from '../../kit/draw/icons.ts';
import { language, t } from '../../kit/core/i18n.ts';
import type { ToDialog } from '../../kit/ui/dialog.ts';
import { lastCopied, Rows, type Clip, type RowItem, type RowRange } from '../../kit/text/rows.ts';
import { caret } from '../../kit/text/textops.ts';
import type { TextOps, ToText } from '../../kit/text/text.ts';
import {
  addStop,
  distanceKm,
  duplicateStops,
  formatLeg,
  MAX_STOPS,
  moveStops,
  pasteStops,
  placesIn,
  putAfter,
  readTrip,
  removeStops,
  routeKm,
  setPlace,
  setText,
  stopsTable,
  tabulate,
  type Stop,
  type TripView,
} from './model.ts';
import { mapOn, setMapOn } from './view.ts';
import '../../kit/ui/bar.ts';
import '../../kit/ui/insert.ts';
import '../../kit/ui/menu.ts';
import '../../kit/ui/dialog.ts';
import '../../kit/text/text.ts';
import './style.css';
import { origin } from '../../kit/core/network.ts';
import { CITY, homeView } from './home.ts';
import { reveal } from '../../kit/ui/scroll.ts';

export const tag = 'to-trip-editor';

const SEARCH = `${origin('placeSearch')}/search`;
/** How long a tap on the map waits to be sure it is not the first of a double tap (which zooms). */
const DOUBLE = 300;
/** A focused pin's nudge, in screen pixels (Shift: five times). */
const NUDGE = 10;

type L = typeof ML;
/**
 * The map is MapLibre GL drawing OpenFreeMap's vector tiles (Paul, 2026-10-15, on issue #4, OpenFreeMap being made for
 * this where OpenStreetMap's tile servers are not: "It's fine to put the openfreemap renderer in, as long as we hot-load
 * it for that path"): the one large thing only this app needs, a file of its own in the build, fetched with the first
 * map and never part of the app file, with its stylesheet and its worker (a file of the site's own, as the policy's
 * worker-src asks; MapLibre would make one from a blob otherwise). A trip drawn on a page, a slide or a card is still
 * OpenStreetMap's raster tiles (view.ts): a picture needs pictures.
 */
let loading: Promise<L> | null = null;
let loaded: L | null = null;
const maplibre = (): Promise<L> => (loading ??= Promise.all([import('maplibre-gl'), import('./maplibre.css')]).then(([m]) => (m.setWorkerUrl(mapWorker), (loaded = m))));
/** The map's style: OpenFreeMap's Liberty, its tiles, sprites and fonts all on the one host (kit/core/network.ts). */
const MAP_STYLE = `${origin('openfreemap')}/styles/liberty`;
// (What the map says under itself, OpenFreeMap's, OpenMapTiles' and OpenStreetMap's names, comes with the tiles' own
// description, as OpenFreeMap asks; written here too it would show twice.)
/** MapLibre's tiles are 512px to Leaflet's 256: one level out shows the same ground, so a zoom written for Leaflet (home.ts) is one less here. */
const Z = (zoom: number) => zoom - 1;

export interface Place {
  name: string;
  detail: string;
  lat: number;
  lon: number;
}
type Field = 'name' | 'note';
/** Where the selection was when an edit began (the entry's mark): stops chosen whole, or the caret in a stop's words. */
type Mark = { range: RowRange<number> } | { i: number; field: Field; offset: number };
const words = (b: Block[]): string =>
  b
    .map((x) => ('runs' in x ? plainText(x.runs) : ''))
    .join(' ')
    .replace(/\n/g, ' ');
const plainBlock = (s: string): Block => ({ k: 'p', runs: s ? [{ t: s }] : [] });

export class ToTripEditor extends DocElement<TripView> {
  static properties: PropertyDeclarations = {
    mapStyle: { attribute: false },
    cur: { state: true },
    showMap: { state: true },
    query: { state: true },
    found: { state: true },
    searching: { state: true },
    presenting: { state: true },
  };
  /** The map's style, by its address (MAP_STYLE); '' draws an empty map (a test, or a map with no network). */
  declare mapStyle: string;
  /** The stop in hand (the caret's, or the last picked), by its place in the route; -1 for none. */
  declare cur: number;
  declare showMap: boolean;
  declare query: string;
  /** What a search found; null before one. */
  declare found: Place[] | null;
  declare searching: boolean;
  /** Presenting (Present in the bar): the stop the map has flown to, by its place in the route; -1 when not presenting. */
  declare presenting: number;
  private map: ML.Map | null = null;
  /** The stops' pins on the map, in the stops' order. */
  private pins: ML.Marker[] = [];
  private mapEl: HTMLElement | null = null;
  /** What the pins were last drawn from, so a render that changed nothing else leaves the map alone. */
  private drawn: { view: TripView; sel: string } | null = null;
  /** Fit the map to the stops at the next drawing: a new document, or a new map. */
  private refit = true;
  /** A tap on the map waiting out a double tap. */
  private tapping = 0;
  /** The pin to give the focus back to once the pins are drawn again (a nudge, by the keys). */
  private pinFocus = -1;
  /** The stop the map last showed for a choice, so it pans once per choice. */
  private panned = -1;
  /** Where a stop found by name goes: after this one (null: the route's end). */
  private findAfter: number | null = null;
  /** The words of each name and note as their editor holds them (a space typed at the end the table does not keep). */
  private drafts = new Map<string, Block>();
  private ones = new WeakMap<Block, Block[]>();
  /** Stops chosen whole: the kit's one implementation (keys, the handle, drag, clipboard, the bar under them). */
  readonly rows = new Rows<number>(this, {
    rows: () => this.rowItems(),
    box: () => this.querySelector<HTMLElement>('.trip-stops'),
    handle: '.trip-n',
    label: t('Chosen stops'),
    contextClass: 'trip-context',
    current: () => (this.view.stops[this.cur] ? this.cur : null),
    edit: (i, offset) => void this.focusField(i, 'name', offset),
    remove: (_s, ids) => this.deleteStops(ids),
    canMove: (s, by) => (by < 0 ? s.from > 0 : s.to < this.view.stops.length),
    move: (s, by) => this.moveRange(s.from, s.to, by),
    duplicate: (s) => this.duplicateRange(s.from, s.to),
    copy: (s) => this.clip(s.from, s.to),
    paste: (data, s) => this.pasteData(data, s ? { replace: [s.from, s.to] } : { after: this.view.stops[this.cur] ? this.cur : null }),
    drop: (i, to) => this.dropAfter(i, to),
    extra: () => drawnIn(AT('rows'), 'context', this),
  });

  constructor() {
    super();
    this.mapStyle = MAP_STYLE;
    this.cur = -1;
    this.showMap = mapOn();
    this.query = '';
    this.found = null;
    this.searching = false;
    this.presenting = -1;
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.onKey);
    // Capturing: before a stop's own editor hears a paste.
    this.addEventListener('paste', this.onPaste, true);
    this.addEventListener('focusout', this.onFocusOut);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKey);
    this.removeEventListener('paste', this.onPaste, true);
    this.removeEventListener('focusout', this.onFocusOut);
    clearTimeout(this.tapping);
    this.dropMap();
    this.mapEl = null;
  }

  protected read(doc: Doc): TripView {
    return readTrip(doc);
  }
  protected willUpdate(changed: PropertyValues) {
    const before = this.doc;
    super.willUpdate(changed);
    if (this.doc === before) return;
    // A new document: fit the map to it; and words that say where are made the table, one splice, undoable.
    this.refit = true;
    this.cur = -1;
    if (this.view.loose) this.edit(tabulate(this.doc));
  }
  protected updated(changed: PropertyValues) {
    void this.syncMap();
    if (changed.has('presenting')) this.hidePins();
    // A stop chosen whole is shown on the map, when it is off the map's view.
    const f = this.rows.range?.focus ?? -1;
    if (f !== this.panned) {
      this.panned = f;
      const s = this.view.stops[f];
      if (s && this.map && !this.map.getBounds().contains([s.lon, s.lat])) this.map.panTo([s.lon, s.lat]);
    }
  }

  /* ---------- undo: the caret or the chosen stops come back ---------- */

  private mark(): Mark | undefined {
    const r = this.rows.range;
    if (r) return { range: { ...r } };
    const field = this.fieldOf(document.activeElement);
    return this.view.stops[this.cur] ? { i: this.cur, field: field ?? 'name', offset: field ? this.caretIn(this.cur, field) : 0 } : undefined;
  }
  /** Every edit carries where the selection was before it. */
  edit(ops: Op[], key?: string, mark?: unknown) {
    super.edit(ops, key, mark ?? this.mark());
  }
  /** After an undo the caret or the chosen stops come back as they were before the edit; else (and after a redo) the stop the change touched first. */
  protected undone(entry: Entry, redo: boolean) {
    this.rows.release();
    const n = this.view.stops.length;
    const m = entry.mark as Mark | undefined;
    if (m && !redo && 'range' in m) {
      const r = m.range;
      if (r.anchor < n && r.focus < n) return void this.updateComplete.then(() => this.rows.select(r));
    } else if (m && !redo && 'i' in m && m.i < n) return void this.focusField(m.i, m.field, m.offset);
    const row = entry.ops.find((o) => o.op === 'rows' || o.op === 'cells');
    const r = row && (row.op === 'rows' || row.op === 'cells') ? row.r : 0;
    const stops = this.view.stops;
    if (!stops.length) return void (this.cur = -1);
    const i = Math.max(
      0,
      stops.findIndex((s) => s.row >= r),
    );
    void this.focusField(stops[i] ? i : stops.length - 1, 'name', 'end');
  }

  /* ---------- the map ---------- */

  /** The Map switch: the map shown or not, and with it whether a trip drawn anywhere (a slide, a page, a card) is on OpenStreetMap's tiles. */
  toggleMap() {
    this.showMap = !this.showMap;
    setMapOn(this.showMap);
  }

  private async syncMap() {
    const el = this.querySelector<HTMLElement>('.trip-map');
    if (el !== this.mapEl) {
      this.dropMap();
      this.mapEl = el;
      if (el) await this.makeMap(el);
      return;
    }
    if (this.map && (this.drawn?.view !== this.view || this.drawn.sel !== this.selKey())) void this.drawPins();
  }
  private async makeMap(el: HTMLElement) {
    const ml = await maplibre();
    if (this.mapEl !== el || !el.isConnected) return;
    // Where the person likely is, until the stops are fitted (a trip with stops never stays there).
    const home = homeView(language(), navigator.languages ?? []);
    let map: ML.Map;
    try {
      map = new ml.Map({
        container: el,
        style: this.mapStyle || { version: 8, sources: {}, layers: [] },
        center: [home.lon, home.lat],
        zoom: Z(home.zoom),
        renderWorldCopies: true,
        attributionControl: { compact: false },
      });
    } catch {
      // No WebGL here (a browser without it, a device that lost it): the map stays a blank box, the stops are the list's.
      return;
    }
    // A tap adds a stop once it is sure not to be the first of a double tap, which zooms (§8): never two stops.
    map.on('click', (e) => {
      clearTimeout(this.tapping);
      const p = e.lngLat.wrap();
      this.tapping = window.setTimeout(() => this.add(p.lat, p.lng), DOUBLE);
    });
    map.on('dblclick', () => clearTimeout(this.tapping));
    // The pins move with the map; one that moves out of its box is out of reach (hidePins), checked as the map moves.
    map.on('move', () => this.hidePins());
    map.on('resize', () => this.hidePins());
    this.map = map;
    this.refit = true;
    void this.drawPins();
    this.dispatchEvent(new Event('trip-map'));
  }
  /**
   * Where I am: the browser asked where the device is, once a tap, and the map centered there at a city's zoom if the map
   * is still this one. Refused, too slow, unknown, or a browser that will not ask: the map goes to the country it opened
   * on (home.ts). The position is never written anywhere.
   */
  locate() {
    const map = this.map;
    if (!map) return;
    const home = () => {
      if (this.map !== map) return;
      const h = homeView(language(), navigator.languages ?? []);
      map.jumpTo({ center: [h.lon, h.lat], zoom: Z(h.zoom) });
    };
    const geo = navigator.geolocation;
    if (!geo) return home();
    try {
      geo.getCurrentPosition((p) => this.map === map && map.jumpTo({ center: [p.coords.longitude, p.coords.latitude], zoom: Z(CITY) }), home, {
        timeout: 5000,
        maximumAge: 600000,
        enableHighAccuracy: false,
      });
    } catch {
      // An insecure page, where the browser will not even ask.
      home();
    }
  }
  private dropMap() {
    this.map?.remove();
    this.map = null;
    this.pins = [];
    this.drawn = null;
  }
  /** Whether a stop is in hand (the caret's) or chosen: its pin is drawn picked. */
  private isSel(i: number): boolean {
    return i === this.cur || this.rows.has(i);
  }
  private selKey(): string {
    return this.view.stops.map((_, i) => (this.isSel(i) ? 1 : 0)).join('');
  }
  /** The pins and the line between them, drawn again. */
  private async drawPins() {
    const ml = await maplibre();
    const { map } = this;
    if (!map) return;
    const v = this.view;
    this.drawn = { view: v, sel: this.selKey() };
    // A pin that has the focus has it again once drawn anew.
    const had = [...(this.mapEl?.querySelectorAll('.trip-pin') ?? [])].indexOf(document.activeElement as Element);
    if (had >= 0) this.pinFocus = had;
    for (const pin of this.pins) pin.remove();
    this.pins = v.stops.map((s, i) => {
      // The pin is a finger wide to hit (44px, style.css), its dot drawn smaller inside; a tab stop, with its name.
      const el = document.createElement('div');
      el.className = `trip-pin${this.isSel(i) ? ' sel' : ''}`;
      el.setAttribute('role', 'button');
      el.tabIndex = 0;
      el.setAttribute('aria-label', s.name || t('Stop {n}', { n: i + 1 }));
      el.innerHTML = `<span>${i + 1}</span>`;
      const pin = new ml.Marker({ element: el, draggable: true }).setLngLat([s.lon, s.lat]).addTo(map);
      let dragged = false;
      pin.on('dragstart', () => (dragged = true));
      pin.on('dragend', () => {
        const p = pin.getLngLat().wrap();
        this.edit(setPlace(this.view, this.view.stops[i], p.lat, p.lng));
        this.cur = i;
      });
      // A tap picks the stop; the tap that ends a drag does not.
      el.addEventListener('click', () => (dragged ? (dragged = false) : this.pick(i, false)));
      el.addEventListener('keydown', (e) => this.onPinKey(e, i));
      if (this.pinFocus === i) el.focus({ preventScroll: true });
      return pin;
    });
    this.pinFocus = -1;
    this.drawRoute(v);
    if (this.refit) {
      this.refit = false;
      this.fit(false);
    }
    this.hidePins();
  }
  /** The line between the stops, in order: a GeoJSON source and a line layer, added once the style has loaded. */
  private drawRoute(v: TripView) {
    const map = this.map;
    if (!map) return;
    const data = {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates: v.stops.length > 1 && v.linked ? v.stops.map((s) => [s.lon, s.lat]) : [] },
    };
    if (!map.isStyleLoaded()) return void map.once('load', () => this.map === map && this.drawRoute(this.view));
    const source = map.getSource('trip-route') as ML.GeoJSONSource | undefined;
    if (source) return source.setData(data);
    map.addSource('trip-route', { type: 'geojson', data });
    map.addLayer({
      id: 'trip-route',
      type: 'line',
      source: 'trip-route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#4f46e5', 'line-width': 4, 'line-opacity': 0.85 },
    });
  }
  /**
   * A pin the map has panned out of its own box is out of reach, as it is out of sight: inert, so neither Tab nor a
   * screen reader's swipe finds it (every pin is a tab stop). The pin with the focus keeps it. While the trip is
   * presented every pin is (the map is a show then, and the keys are the show's).
   */
  private hidePins() {
    const map = this.map;
    const box = this.mapEl;
    if (!map || !box) return;
    const w = box.clientWidth;
    const h = box.clientHeight;
    for (const pin of this.pins) {
      const el = pin.getElement();
      const p = map.project(pin.getLngLat());
      const out = p.x < 0 || p.y < 0 || p.x > w || p.y > h;
      el.inert = this.presenting >= 0 || (out && el !== document.activeElement);
    }
  }
  /** The whole route in view. */
  fit(animate = true) {
    const map = this.map;
    const s = this.view.stops;
    if (!map || !s.length) return;
    if (s.length === 1) return void map[animate ? 'easeTo' : 'jumpTo']({ center: [s[0].lon, s[0].lat], zoom: Z(12) });
    const bounds = s.reduce((b, p) => b.extend([p.lon, p.lat]), new (this.ml()!.LngLatBounds)());
    map.fitBounds(bounds, { padding: 36, animate });
  }
  /** The map library, once it has loaded (every call that draws comes after the map, which needed it). */
  private ml(): L | null {
    return loaded;
  }
  /* ---------- presenting: the map flies stop to stop ---------- */

  /** Present: the map the whole screen, flown to the first stop; a click, Space or the right arrow on to the next, Escape ends. */
  async present() {
    if (!this.view.stops.length) return;
    this.showMap = true;
    this.presenting = 0;
    await this.updateComplete;
    // The map may still be on its way (MapLibre is imported lazily, and made after the next frame).
    for (let n = 0; !this.map && this.mapEl && n < 100; n++) await new Promise((r) => setTimeout(r, 20));
    this.map?.resize();
    this.goStop(0);
    this.querySelector<HTMLElement>('.trip-present')?.focus({ preventScroll: true });
  }
  /** The `i`th stop, flown to and named (round neither end: the first and the last stay put). */
  goStop(i: number) {
    const stops = this.view.stops;
    if (this.presenting < 0 || !stops.length) return;
    this.presenting = Math.max(0, Math.min(stops.length - 1, i));
    const s = stops[this.presenting];
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const zoom = Math.max(this.map?.getZoom() ?? 0, Z(10));
    if (still) this.map?.jumpTo({ center: [s.lon, s.lat], zoom });
    else this.map?.flyTo({ center: [s.lon, s.lat], zoom, duration: 1600 });
  }
  endPresenting() {
    if (this.presenting < 0) return;
    this.presenting = -1;
    void this.updateComplete.then(() => {
      this.map?.resize();
      this.fit(false);
      this.querySelector<HTMLElement>('.trip-bar .trip-present-btn')?.focus();
    });
  }
  private onPresentKey = (e: KeyboardEvent) => {
    if (runKey(e, AT('show'), this)) e.stopPropagation();
  };
  private renderPresent() {
    const stops = this.view.stops;
    const s = stops[this.presenting];
    if (!s) return nothing;
    const n = stops.length;
    const leg = this.presenting > 0 && this.view.linked ? formatLeg(distanceKm(stops[this.presenting - 1], s), this.view.units) : '';
    return html`<div class="trip-present" role="dialog" aria-modal="true" tabindex="-1" aria-label=${t('Presenting the trip')} @keydown=${this.onPresentKey}>
      <div class="trip-present-words" aria-live="polite">
        <b>${t('{n} of {count}', { n: this.presenting + 1, count: n })} · ${s.name || `${s.lat}, ${s.lon}`}</b>
        ${s.note ? html`<span>${s.note}</span>` : nothing}
        ${leg ? html`<small>${leg}</small>` : nothing}
      </div>
      <div class="trip-present-ctl">
        <button type="button" class="to-btn to-tool" aria-label=${t('The stop before')} title=${t('The stop before')} ?disabled=${this.presenting === 0} @click=${() => this.goStop(this.presenting - 1)}>${icon(UI.up, 20)}</button>
        <button type="button" class="to-btn to-tool" aria-label=${t('The next stop')} title=${t('The next stop')} ?disabled=${this.presenting >= n - 1} @click=${() => this.goStop(this.presenting + 1)}>${icon(UI.down, 20)}</button>
        <button type="button" class="to-btn to-tool" aria-label=${t('Stop presenting')} title=${t('Stop presenting')} @click=${() => this.endPresenting()}>${icon(UI.close, 20)}</button>
      </div>
    </div>`;
  }

  /** A stop shown on the map (from the list's bar), or picked on it (a pin: the stop chosen, its row in view). */
  private pick(i: number, toMap = true) {
    const s = this.view.stops[i];
    if (!s) return;
    this.cur = i;
    if (toMap && this.map) this.map.jumpTo({ center: [s.lon, s.lat], zoom: Math.max(this.map.getZoom(), Z(11)) });
    if (!toMap) {
      this.panned = i;
      this.rows.choose(i);
      void this.updateComplete.then(() => reveal(this.querySelector(`.trip-stop[data-i="${i}"]`)));
    }
  }
  /** The pin with the focus, while its keys are answered (commands.ts). */
  pinAt = -1;
  /** A focused pin: the arrows nudge its stop (a burst is one undo), Delete takes it away, Escape gives the focus back to the map. */
  private onPinKey(e: KeyboardEvent, i: number) {
    if (!this.map || !this.view.stops[i]) return;
    this.pinAt = i;
    try {
      // Not the map's own keys (the map pans on the arrows): the pin's.
      if (runKey(e, AT('pin'), this)) e.stopPropagation();
    } finally {
      this.pinAt = -1;
    }
  }
  nudgePin(e: KeyboardEvent): boolean {
    const i = this.pinAt;
    const map = this.map;
    const s = this.view.stops[i];
    if (!map || !s) return false;
    const by = e.shiftKey ? NUDGE * 5 : NUDGE;
    const k = e.key;
    const d = k === 'ArrowLeft' ? [-by, 0] : k === 'ArrowRight' ? [by, 0] : k === 'ArrowUp' ? [0, -by] : k === 'ArrowDown' ? [0, by] : null;
    if (!d) return false;
    const p = map.project([s.lon, s.lat]);
    const to = map.unproject([p.x + d[0], p.y + d[1]]).wrap();
    this.cur = i;
    this.pinFocus = i;
    this.edit(setPlace(this.view, s, to.lat, to.lng), `place:${s.row}`);
    return true;
  }
  leavePin() {
    this.cur = -1;
    this.mapEl?.focus({ preventScroll: true });
  }

  /* ---------- the words ---------- */

  private stopEl(i: number): HTMLElement | null {
    return this.querySelector<HTMLElement>(`.trip-stop[data-i="${i}"]`);
  }
  private textOf(i: number, field: Field): ToText | null {
    return this.querySelector<ToText>(`.trip-stop[data-i="${i}"] to-text.trip-${field}`);
  }
  private fieldOf(el: Element | null): Field | null {
    const x = el?.closest?.('to-text');
    return x?.classList.contains('trip-name') ? 'name' : x?.classList.contains('trip-note') ? 'note' : null;
  }
  /** A stop's name or note as its editor takes it: the words it holds (a draft kept while it says what the table says). */
  private blocksFor(s: Stop, field: Field): Block[] {
    const key = `${field}:${s.row}`;
    let b = this.drafts.get(key);
    if (!b || words([b]).replace(/\s+/g, ' ').trim() !== s[field]) this.drafts.set(key, (b = plainBlock(s[field])));
    let a = this.ones.get(b);
    if (!a) this.ones.set(b, (a = [b]));
    return a;
  }
  private onOps(e: CustomEvent<TextOps>, i: number, field: Field) {
    e.stopPropagation();
    const s = this.view.stops[i];
    if (!s) return;
    const { ops, kind, before } = e.detail;
    const key = `${field}:${s.row}`;
    // The words are plain cells: whatever the ops made is read back as words (no marks, one line).
    const now = words(applyAll({ head: {}, blocks: this.blocksFor(s, field) }, ops).blocks);
    this.drafts.set(key, plainBlock(now));
    const mark: Mark = { i, field, offset: before ? before.focus.offset : 0 };
    this.edit(setText(this.doc, this.view, s, field, now), kind ? key : undefined, mark);
    this.requestUpdate();
  }
  /** Where a person starts: the first stop's name, the caret at its end, else the map (the page held still). */
  async focusFirst() {
    await this.updateComplete;
    const x = this.view.stops.length ? this.textOf(0, 'name') : null;
    if (!x) {
      // The map takes the focus once MapLibre has made it (its import is lazy); with the map off, Insert (never the page).
      if (this.showMap) await maplibre();
      // (The map's canvas is its tab stop: MapLibre's keys listen there.)
      return (this.querySelector<HTMLElement>('.trip-map .maplibregl-canvas') ?? this.querySelector<HTMLElement>('.trip-map') ?? this.querySelector<HTMLElement>('to-insert button'))?.focus({
        preventScroll: true,
      });
    }
    this.cur = 0;
    await x.updateComplete;
    x.sel = caret(0, words(x.blocks).length);
  }
  /** The words of a stop's name or note, once drawn, with the caret at `offset`. */
  private async focusField(i: number, field: Field, offset: number | 'end' = 'end') {
    this.cur = i;
    await this.updateComplete;
    const x = this.textOf(i, field);
    if (!x) return;
    await x.updateComplete;
    const len = words(x.blocks).length;
    x.sel = caret(0, offset === 'end' ? len : Math.min(offset, len));
    reveal(this.stopEl(i));
  }
  /** Where the caret is in a stop's name or note, or their end. */
  private caretIn(i: number, field: Field): number {
    const x = this.textOf(i, field);
    return x?.sel ? x.sel.focus.offset : words(x?.blocks ?? []).length;
  }
  /** A stop at a place, after stop `after` (by default the one in hand; null: the route's end). */
  private add(lat: number, lon: number, name = '', after: number | null = this.view.stops[this.cur] ? this.cur : null) {
    const ops = addStop(this.doc, this.view, lat, lon, name, after);
    if (!ops.length) return;
    this.edit(ops);
    this.cur = after === null ? this.view.stops.length - 1 : after + 1;
    // A stop found by name has one; one tapped on the map is named next.
    if (!name) void this.focusField(this.cur, 'name', 0);
  }
  /** Enter: from the name to the note; from the note, the next stop, asked for by name (a stop needs a place). */
  private onEnter(i: number, field: Field) {
    if (field === 'name') return void this.focusField(i, 'note', 0);
    if (this.view.stops.length >= MAX_STOPS) return;
    this.findAfter = i;
    void this.openSearch();
  }
  /**
   * Backspace at the start of words, or Delete at their end (the line says which). A stop with no name and no note
   * goes, the caret to the stop above (Delete: below); Backspace at the start of a note goes back to the name.
   */
  private onExit(i: number, field: Field, dir: 'back' | 'forward') {
    const s = this.view.stops[i];
    if (!s) return;
    if (field === 'note' && dir === 'back') return void this.focusField(i, 'name', 'end');
    if (s.name || s.note || words(this.blocksFor(s, field)).length) return;
    this.edit(removeStops(this.view, [i]));
    const n = this.view.stops.length;
    if (!n) return void this.leave();
    if (dir === 'back' && i > 0) void this.focusField(i - 1, 'note', 'end');
    else void this.focusField(Math.min(i, n - 1), 'name', 0);
  }
  /** Alt+Up/Down in the words: the stop past its neighbour, the caret where it was. */
  moveOne(i: number, by: -1 | 1, field: Field) {
    const ops = moveStops(this.doc, this.view, i, i + 1, by);
    if (!ops.length) return;
    const offset = this.caretIn(i, field);
    this.edit(ops);
    void this.focusField(i + by, field, offset);
  }
  /** Mod+D in the words: the stop again after it, the caret in the copy where it was. */
  duplicateOne(i: number, field: Field) {
    const ops = duplicateStops(this.doc, this.view, i, i + 1);
    if (!ops.length) return;
    const offset = this.caretIn(i, field);
    this.edit(ops);
    void this.focusField(i + 1, field, offset);
  }
  /** The stop and the field a key is typed in, while the commands answer it (commands.ts). */
  here: { i: number; field: Field } | null = null;
  private onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return;
    // Mod+Alt+Enter presents, from anywhere in the editor (as the Deck does).
    if (
      runKey(
        e,
        TRIP.filter((c) => c.id === 'trip.present'),
        this,
      )
    )
      return;
    const target = e.composedPath()[0] as HTMLElement;
    // Only words being typed in a stop: never a bar button, a field, the list, a popover or a dialog.
    if (target.closest?.('[popover], dialog')) return;
    const row = target.closest?.<HTMLElement>('.trip-stop');
    const field = this.fieldOf(target);
    if (!row || !field) return;
    const i = Number(row.dataset.i);
    if (!this.view.stops[i]) return;
    this.here = { i, field };
    try {
      runKey(e, AT('words'), this);
    } finally {
      this.here = null;
    }
  };
  /** Up and Down in a stop's words: the same field of the stop before or after. */
  stepStop(by: -1 | 1): boolean {
    const { i, field } = this.here!;
    if (!this.view.stops[i + by]) return false;
    void this.focusField(i + by, field, this.caretIn(i, field));
    return true;
  }
  /** The focus gone from the editor altogether: no stop is in hand. */
  private onFocusOut = (e: FocusEvent) => {
    const to = e.relatedTarget as Node | null;
    if (!to || !this.contains(to)) this.cur = -1;
  };
  /** With no stop left to hold the focus, it goes to Insert (never to the page). */
  private leave() {
    this.cur = -1;
    void this.updateComplete.then(() => this.querySelector<HTMLElement>('to-insert button')?.focus({ preventScroll: true }));
  }

  /* ---------- stops chosen whole (kit/text/rows.ts) ---------- */

  private rowItems(): RowItem<number>[] {
    const host = this;
    return this.view.stops.map((_, i) => ({
      id: i,
      span: { from: i, to: i + 1 },
      get el() {
        return host.stopEl(i)!;
      },
    }));
  }
  /** Stops taken away (by their places); the caret into the stop before them (or the one after, as it is then). */
  deleteStops(ids: number[]) {
    if (!ids.length) return;
    const first = Math.min(...ids);
    this.edit(removeStops(this.view, ids));
    const n = this.view.stops.length;
    if (!n) return this.leave();
    if (first > 0) void this.focusField(first - 1, 'name', 'end');
    else void this.focusField(0, 'name', 0);
  }
  private moveRange(from: number, to: number, by: -1 | 1): RowRange<number> | null {
    const r = this.rows.range;
    const ops = moveStops(this.doc, this.view, from, to, by);
    if (!r || !ops.length) return r;
    this.edit(ops);
    return { anchor: r.anchor + by, focus: r.focus + by };
  }
  /** The chosen stops again, right after them; the copies are chosen. */
  private duplicateRange(from: number, to: number): RowRange<number> | null {
    const r = this.rows.range;
    const ops = duplicateStops(this.doc, this.view, from, to);
    if (!r || !ops.length) return r;
    this.edit(ops);
    return { anchor: r.anchor + to - from, focus: r.focus + to - from };
  }
  /** A stop carried by its number, put after another; the caret follows it. */
  private dropAfter(i: number, to: number) {
    const p = putAfter(this.doc, this.view, i, to);
    if (!p.ops.length) return;
    this.edit(p.ops);
    void this.focusField(p.at, 'name', 'end');
  }

  /* ---------- the clipboard ---------- */

  /** What chosen stops put on the clipboard: a table of them as TLO, and as our HTML (a sheet takes it as a table). */
  private clip(from: number, to: number): Clip {
    const table = stopsTable(this.view, from, to);
    return { text: write({ head: {}, blocks: [table] }), html: docToHtml([table]) };
  }
  /** The places pasted data holds: ours (or plain text) read as TLO, HTML from elsewhere as blocks. */
  private placesOf(data: Clip) {
    const ours = data.html.includes(`content="${GENERATOR}"`);
    const fromHtml = !ours && data.html.trim() ? placesIn({ head: {}, blocks: htmlToBlocks(data.html) }) : [];
    return fromHtml.length ? fromHtml : placesIn(parse(clipText(data)));
  }
  /** A paste into a stop's words (chosen stops are the rows controller's): places are stops after it; words alone are its own. */
  private onPaste = (e: ClipboardEvent) => {
    const el = e.target as HTMLElement;
    const dt = e.clipboardData;
    if (!dt || this.rows.range || !el.closest?.('to-text') || el.closest('dialog, [popover]')) return;
    const row = el.closest<HTMLElement>('.trip-stop');
    if (!row) return;
    const text = dt.getData('text/plain').replace(/\r\n?/g, '\n');
    const mine = lastCopied();
    const data = { text, html: dt.getData('text/html') || (mine?.text === text ? mine.html : '') };
    if (!this.placesOf(data).length) return;
    e.preventDefault();
    e.stopPropagation();
    this.pasteData(data, { after: Number(row.dataset.i) });
  };
  /** Pasted places put in as stops; the caret at the end of the last one's name. */
  private pasteData(data: Clip, at: { replace: [number, number] } | { after: number | null }) {
    const r = pasteStops(this.doc, this.view, this.placesOf(data), at);
    if (!r) return;
    this.edit(r.ops);
    this.rows.release();
    void this.focusField(r.at + r.n - 1, 'name', 'end');
  }

  /* ---------- finding a place by name ---------- */

  async openSearch() {
    this.found = null;
    const d = this.querySelector<ToDialog>('to-dialog.trip-find');
    await d?.show();
    this.querySelector<HTMLInputElement>('.trip-find input[type=search]')?.focus();
  }
  private async search(e: Event) {
    e.preventDefault();
    const q = this.query.trim();
    if (!q || this.searching) return;
    this.searching = true;
    try {
      // Nominatim's usage policy asks that a request say which application makes it: the site's own name goes as the
      // referrer, the origin alone (never the page's path or anything after its "#"), where the page sends none elsewhere.
      const res = await fetch(`${SEARCH}?format=jsonv2&limit=6&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' }, referrerPolicy: 'strict-origin' });
      const rows = (await res.json()) as { name?: string; display_name: string; lat: string; lon: string }[];
      this.found = rows.map((r) => ({ name: r.name || r.display_name.split(',')[0], detail: r.display_name, lat: parseFloat(r.lat), lon: parseFloat(r.lon) }));
    } catch {
      this.found = [];
    } finally {
      this.searching = false;
    }
  }
  private choose(p: Place) {
    this.querySelector<ToDialog>('to-dialog.trip-find')?.close();
    this.query = '';
    this.found = null;
    this.add(p.lat, p.lon, p.name, this.findAfter);
    this.map?.jumpTo({ center: [p.lon, p.lat], zoom: Math.max(this.map.getZoom(), Z(11)) });
    if (this.view.stops[this.cur]) void this.focusField(this.cur, 'note', 0);
  }

  /* ---------- the bar ---------- */

  /** Whether the map is drawn (MapLibre loaded and shown). */
  get hasMap(): boolean {
    return !!this.map;
  }
  /** Insert ▾: a place found by name, after the stop in hand. */
  findPlace() {
    this.findAfter = this.view.stops[this.cur] ? this.cur : null;
    void this.openSearch();
  }
  /** Insert ▾: a stop at the middle of the map, after the stop in hand. */
  addAtMiddle() {
    const c = this.map?.getCenter().wrap();
    if (c) this.add(c.lat, c.lng, '', this.view.stops[this.cur] ? this.cur : null);
  }
  /** The chosen stops' first, shown on the map. */
  showChosen() {
    const s = this.rows.span();
    if (s) this.pick(s.from);
  }

  /* ---------- drawing ---------- */

  private leg(i: number) {
    const v = this.view;
    if (!i || !v.linked) return nothing;
    const d = formatLeg(distanceKm(v.stops[i - 1], v.stops[i]), v.units);
    return html`<span class="trip-leg">${v.units === 'h' ? t('about {time} by car', { time: d }) : d}</span>`;
  }
  private wordsBox(s: Stop, i: number, field: Field) {
    const n = i + 1;
    return html`<to-text
      class="trip-${field}"
      shape="line"
      no-bubble
      .blocks=${this.blocksFor(s, field)}
      label=${field === 'name' ? t('Name of stop {n}', { n }) : t('Note for stop {n}', { n })}
      placeholder=${field === 'name' ? t('Name') : t('Note')}
      @text-ops=${(e: CustomEvent<TextOps>) => this.onOps(e, i, field)}
      @text-enter=${(e: Event) => (e.stopPropagation(), this.onEnter(i, field))}
      @text-exit=${(e: CustomEvent<{ dir: 'back' | 'forward' }>) => (e.stopPropagation(), this.onExit(i, field, e.detail.dir))}
      @text-selectall=${(e: Event) => (e.stopPropagation(), this.rows.selectAll())}
    ></to-text>`;
  }
  private row(s: Stop, i: number) {
    const n = i + 1;
    const ranged = this.rows.has(i);
    const label = t('Stop {n}: a tap chooses it, a drag moves it', { n });
    return html`<li class="trip-stop ${i === this.cur ? 'sel' : ''} ${ranged ? 'ranged' : ''} ${this.rows.drag?.id === i ? 'dragging' : ''}" data-i=${i} @focusin=${() => (this.cur = i)}>
      ${this.leg(i)}
      <button type="button" class="trip-n to-rows-handle" aria-pressed=${String(ranged)} aria-label=${label} title=${label}>${n}</button>
      <div class="trip-fields">${this.wordsBox(s, i, 'name')}${this.wordsBox(s, i, 'note')}</div>
    </li>`;
  }
  private findBody() {
    return html`<form class="trip-find-form" role="search" @submit=${(e: Event) => this.search(e)}>
        <input type="search" enterkeyhint="search" autocomplete="off" aria-label=${t('Find a place')} placeholder=${t('A town, an address, a museum')} .value=${this.query} @input=${(e: Event) => (this.query = (e.target as HTMLInputElement).value)} />
        <button type="submit" class="to-btn" ?disabled=${!this.query.trim() || this.searching}>${icon(UI.search)}<span>${t('Search')}</span></button>
      </form>
      <p class="to-hint">${t('Searching sends the words you type to OpenStreetMap’s Nominatim, and nothing else.')}</p>
      ${this.searching ? html`<p class="to-hint" role="status">${t('Searching…')}</p>` : nothing}
      ${
        this.found
          ? this.found.length
            ? html`<ul class="trip-found" aria-label=${t('Places found')}>
              ${this.found.map((p) => html`<li><button type="button" @click=${() => this.choose(p)}><b>${p.name}</b><span>${p.detail}</span></button></li>`)}
            </ul>`
            : html`<p class="to-hint" role="status">${t('Nothing found.')}</p>`
          : nothing
      }`;
  }
  render() {
    const v = this.view;
    const n = v.stops.length;
    const total = n > 1 && v.linked ? formatLeg(routeKm(v.stops), v.units) : '';
    const own = (id: string) => TRIP.find((c) => c.id === `trip.${id}`)!;
    return html`<to-bar class="trip-bar">
        <to-insert .items=${drawnIn(TRIP, 'menu:insert', this)}></to-insert>
        ${cmdMenu(own('units'), this, TRIP, 'trip-units')}
        ${['linked', 'fit', 'locate', 'map'].map((id) => cmdTool(own(id), this, { keep: false }))}
        ${cmdTool(own('present'), this, { cls: 'trip-present-btn' })}
        <span class="to-hint trip-count">${t('{n|one stop|# stops}', { n })}${total ? html` · <b>${total}</b>` : nothing}</span>
        ${this.undoTools()}
      </to-bar>
      <div class="trip ${this.showMap ? '' : 'no-map'} ${this.presenting >= 0 ? 'presenting' : ''}">
        ${
          this.showMap
            ? html`<div class="trip-side">
              <div class="trip-map" data-spatial role="region" aria-label=${t('Map: tap to add a stop')}></div>
              <p class="to-hint trip-privacy">${t('The map comes from OpenFreeMap while it is shown.')} ${n ? nothing : t('Your location is asked for only to center the map, and is never written anywhere.')}</p>
            </div>`
            : nothing
        }
        ${
          n
            ? html`<ol class="trip-stops" tabindex="-1" aria-label=${t('Stops')}>${v.stops.map((s, i) => this.row(s, i))}</ol>`
            : html`<p class="to-hint trip-empty">${this.showMap ? t('Tap the map to add the first stop, or Insert a place by name.') : t('Insert a place by name.')}</p>`
        }
      </div>
      ${this.presenting >= 0 ? this.renderPresent() : nothing}
      ${this.rows.renderContext()}
      <to-dialog class="trip-find" heading=${t('A place by name')} .body=${this.findBody()}></to-dialog>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToTripEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-trip-editor': ToTripEditor;
  }
}
