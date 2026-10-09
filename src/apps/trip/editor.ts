/**
 * <to-trip-editor>: the Trip app. A map (Leaflet, a lazy chunk of its own) above the stops, beside them when
 * there is room. A tap on the map adds a stop there; a pin dragged moves its stop; Insert ▾ finds a place by
 * name (OpenStreetMap's Nominatim, asked only when Search is tapped) or puts a stop at the map's middle.
 * Each stop is a row: its number (a tap shows it on the map), its name and note (plain inputs, as the table's
 * cells are plain words), and a menu to move or delete it; Alt+Up/Down move it too. The bar holds Insert ▾,
 * the units, whether the stops are a route or dots, the whole route in view, the map on or off, undo and redo.
 *
 * This is the one app that talks to the network by itself: while the map is on view its pictures come from
 * tile.openstreetmap.org. The route itself lives only in the link. Every change is operations on the
 * document's table (model.ts).
 */
import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import type * as Leaflet from 'leaflet';
import { ArrowDown, ArrowUp, Crosshair, Ellipsis, Map as MapIcon, Ruler, Scan, Spline } from 'lucide';
import type { Doc } from '../../doc/index.ts';
import { tool } from '../../kit/bar.ts';
import { DocElement } from '../../kit/element.ts';
import { icon, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import type { ToDialog } from '../../kit/dialog.ts';
import type { MenuItem, ToMenu } from '../../kit/menu.ts';
import { addStop, distanceKm, formatLeg, MAX_STOPS, moveStop, readTrip, removeStop, routeKm, setLinked, setPlace, setText, setUnits, tabulate, type Stop, type TripView, type Units } from './model.ts';
import '../../kit/bar.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/dialog.ts';
import './style.css';

export const tag = 'to-trip-editor';

export const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const SEARCH = 'https://nominatim.openstreetmap.org/search';

type L = typeof Leaflet;
// The map library is the one large thing only this app needs: it arrives with the first map, in a chunk of its own.
let loading: Promise<L> | null = null;
const leaflet = (): Promise<L> => (loading ??= Promise.all([import('leaflet'), import('./leaflet.css')]).then(([m]) => m));

export interface Place {
  name: string;
  detail: string;
  lat: number;
  lon: number;
}

export class ToTripEditor extends DocElement<TripView> {
  static properties: PropertyDeclarations = {
    tiles: { attribute: false },
    cur: { state: true },
    showMap: { state: true },
    menuAt: { state: true },
    query: { state: true },
    found: { state: true },
    searching: { state: true },
  };
  /** Where the map's pictures come from; '' draws none (a test, or a map with no network). */
  declare tiles: string;
  /** The stop picked, by its place in the route; -1 for none. */
  declare cur: number;
  declare showMap: boolean;
  /** The stop whose menu is open. */
  declare menuAt: number;
  declare query: string;
  /** What a search found; null before one. */
  declare found: Place[] | null;
  declare searching: boolean;
  private map: Leaflet.Map | null = null;
  private layer: Leaflet.LayerGroup | null = null;
  private mapEl: HTMLElement | null = null;
  private watch: ResizeObserver | null = null;
  /** What the pins were last drawn from, so a render that changed nothing else leaves the map alone. */
  private drawn: { view: TripView; cur: number } | null = null;
  /** Fit the map to the stops at the next drawing: a new document, or a new map. */
  private refit = true;

  constructor() {
    super();
    this.tiles = TILES;
    this.cur = -1;
    this.showMap = true;
    this.menuAt = -1;
    this.query = '';
    this.found = null;
    this.searching = false;
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
  protected undone() {
    if (this.cur >= this.view.stops.length) this.cur = -1;
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.dropMap();
    this.mapEl = null;
  }
  protected updated() {
    void this.syncMap();
  }

  /* ---------- the map ---------- */

  private async syncMap() {
    const el = this.querySelector<HTMLElement>('.trip-map');
    if (el !== this.mapEl) {
      this.dropMap();
      this.mapEl = el;
      if (el) await this.makeMap(el);
      return;
    }
    if (this.map && (this.drawn?.view !== this.view || this.drawn.cur !== this.cur)) this.drawPins();
  }
  private async makeMap(el: HTMLElement) {
    const L = await leaflet();
    if (this.mapEl !== el || !el.isConnected) return;
    const map = L.map(el, { worldCopyJump: true, attributionControl: true }).setView([25, 0], 2);
    if (this.tiles) L.tileLayer(this.tiles, { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    map.attributionControl.setPrefix('');
    this.layer = L.layerGroup().addTo(map);
    map.on('click', (e: Leaflet.LeafletMouseEvent) => this.add(e.latlng.lat, e.latlng.wrap().lng));
    this.map = map;
    this.watch = new ResizeObserver(() => map.invalidateSize());
    this.watch.observe(el);
    this.refit = true;
    this.drawPins();
    this.dispatchEvent(new Event('trip-map'));
  }
  private dropMap() {
    this.watch?.disconnect();
    this.watch = null;
    this.map?.remove();
    this.map = null;
    this.layer = null;
    this.drawn = null;
  }
  /** The pins and the line between them, drawn again. */
  private async drawPins() {
    const L = await leaflet();
    const { map, layer } = this;
    if (!map || !layer) return;
    const v = this.view;
    this.drawn = { view: v, cur: this.cur };
    layer.clearLayers();
    const pts = v.stops.map((s) => L.latLng(s.lat, s.lon));
    if (pts.length > 1 && v.linked) L.polyline(pts, { color: '#4f46e5', weight: 4, opacity: 0.85, interactive: false }).addTo(layer);
    v.stops.forEach((s, i) => {
      const pin = L.marker(pts[i], {
        draggable: true,
        keyboard: true,
        title: s.name || t('Stop {n}', { n: i + 1 }),
        icon: L.divIcon({ className: `trip-pin${i === this.cur ? ' sel' : ''}`, html: String(i + 1), iconSize: [30, 30], iconAnchor: [15, 15] }),
      });
      pin.on('click', () => this.pick(i, false));
      pin.on('dragend', () => {
        const p = pin.getLatLng().wrap();
        this.edit(setPlace(this.view, this.view.stops[i], p.lat, p.lng));
        this.cur = i;
      });
      pin.addTo(layer);
    });
    if (this.refit) {
      this.refit = false;
      this.fit(false);
    }
  }
  /** The whole route in view. */
  private fit(animate = true) {
    const map = this.map;
    const s = this.view.stops;
    if (!map || !s.length) return;
    if (s.length === 1) map.setView([s[0].lat, s[0].lon], 12, { animate });
    else map.fitBounds(s.map((p) => [p.lat, p.lon] as [number, number]), { padding: [36, 36], animate });
  }
  /** A stop picked: shown on the map, its row in view (and focused, when asked from the list). */
  private pick(i: number, toMap = true) {
    this.cur = i;
    const s = this.view.stops[i];
    if (toMap && s && this.map) this.map.setView([s.lat, s.lon], Math.max(this.map.getZoom(), 11));
    if (!toMap) void this.updateComplete.then(() => this.querySelector(`.trip-stop[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest' }));
  }

  /* ---------- editing ---------- */

  private add(lat: number, lon: number, name = '') {
    const ops = addStop(this.doc, this.view, lat, lon, name);
    if (!ops.length) return;
    this.edit(ops);
    this.cur = this.view.stops.length - 1;
    // A stop found by name has one; one tapped on the map is named next.
    if (!name) void this.focusField(this.cur, 'name');
  }
  private async focusField(i: number, field: 'name' | 'note') {
    await this.updateComplete;
    const input = this.querySelector<HTMLInputElement>(`.trip-stop[data-i="${i}"] .trip-${field}`);
    input?.focus({ preventScroll: true });
    input?.scrollIntoView({ block: 'nearest' });
  }
  private typed(s: Stop, field: 'name' | 'note', value: string) {
    this.edit(setText(this.doc, this.view, s, field, value), `${field}:${s.row}`);
  }
  private move(i: number, by: -1 | 1, field?: 'name' | 'note') {
    const ops = moveStop(this.doc, this.view, i, by);
    if (!ops.length) return;
    this.edit(ops);
    this.cur = i + by;
    if (field) void this.focusField(i + by, field);
  }
  private removeAt(i: number) {
    this.edit(removeStop(this.view, this.view.stops[i]));
    this.cur = -1;
  }
  private onStopKey = (e: KeyboardEvent, i: number) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const field = (e.target as HTMLElement).classList.contains('trip-note') ? 'note' : 'name';
    this.move(i, e.key === 'ArrowUp' ? -1 : 1, field);
  };

  /* ---------- finding a place by name ---------- */

  private async openSearch() {
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
      const res = await fetch(`${SEARCH}?format=jsonv2&limit=6&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
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
    this.add(p.lat, p.lon, p.name);
    this.map?.setView([p.lat, p.lon], Math.max(this.map.getZoom(), 11));
  }

  /* ---------- the bar and the menus ---------- */

  private inserts(): MenuItem[] {
    const full = this.view.stops.length >= MAX_STOPS;
    return [
      { label: t('A place by name…'), icon: UI.search, disabled: full, does: () => void this.openSearch() },
      {
        label: t('A stop at the middle of the map'),
        icon: Crosshair,
        disabled: full || !this.map,
        does: () => {
          const c = this.map?.getCenter().wrap();
          if (c) this.add(c.lat, c.lng);
        },
      },
    ];
  }
  private unitItems(): MenuItem[] {
    const pick = (u: Units, label: string): MenuItem => ({ label, checked: this.view.units === u, does: () => this.edit(setUnits(this.doc, u)) });
    return [pick('h', t('Hours of driving')), pick('m', t('Miles')), pick('k', t('Kilometres'))];
  }
  private async openMenu(i: number, button: HTMLElement) {
    this.menuAt = i;
    await this.updateComplete;
    const menu = this.querySelector<ToMenu>('to-menu.trip-rowmenu');
    await menu?.updateComplete;
    menu?.openAt(button);
  }
  private rowItems(): MenuItem[] {
    const i = this.menuAt;
    if (!this.view.stops[i]) return [];
    return [
      { label: t('Move up'), icon: ArrowUp, disabled: i === 0, does: () => this.move(i, -1) },
      { label: t('Move down'), icon: ArrowDown, disabled: i === this.view.stops.length - 1, does: () => this.move(i, 1) },
      { label: t('Delete stop'), icon: UI.trash, does: () => this.removeAt(i) },
    ];
  }

  /* ---------- drawing ---------- */

  private leg(i: number) {
    const v = this.view;
    if (!i || !v.linked) return nothing;
    const d = formatLeg(distanceKm(v.stops[i - 1], v.stops[i]), v.units);
    return html`<span class="trip-leg">${v.units === 'h' ? t('about {time} by car', { time: d }) : d}</span>`;
  }
  private row(s: Stop, i: number) {
    const n = i + 1;
    return html`<li class="trip-stop ${i === this.cur ? 'sel' : ''}" data-i=${i} @focusin=${() => (this.cur = i)} @keydown=${(e: KeyboardEvent) => this.onStopKey(e, i)}>
      ${this.leg(i)}
      <button type="button" class="trip-n" aria-label=${t('Show stop {n} on the map', { n })} title=${t('Show stop {n} on the map', { n })} @click=${() => this.pick(i)}>${n}</button>
      <div class="trip-fields">
        <input class="trip-name" enterkeyhint="next" autocomplete="off" aria-label=${t('Name of stop {n}', { n })} placeholder=${t('Name')} .value=${s.name} @input=${(e: Event) => this.typed(s, 'name', (e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.preventDefault(), void this.focusField(i, 'note'))} />
        <input class="trip-note" enterkeyhint="done" autocomplete="off" aria-label=${t('Note for stop {n}', { n })} placeholder=${t('Note')} .value=${s.note} @input=${(e: Event) => this.typed(s, 'note', (e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
      </div>
      <button type="button" class="to-btn to-tool trip-more" aria-haspopup="menu" aria-label=${t('Stop {n} options', { n })} title=${t('Stop {n} options', { n })} @click=${(e: Event) => void this.openMenu(i, e.currentTarget as HTMLElement)}>${icon(Ellipsis, 18)}</button>
    </li>`;
  }
  private findBody() {
    return html`<form class="trip-find-form" role="search" @submit=${(e: Event) => this.search(e)}>
        <input type="search" enterkeyhint="search" autocomplete="off" aria-label=${t('Find a place')} placeholder=${t('A town, an address, a museum')} .value=${this.query} @input=${(e: Event) => (this.query = (e.target as HTMLInputElement).value)} />
        <button type="submit" class="to-btn" ?disabled=${!this.query.trim() || this.searching}>${icon(UI.search)}<span>${t('Search')}</span></button>
      </form>
      <p class="to-hint">${t('Searching sends the words you type to OpenStreetMap’s Nominatim, and nothing else.')}</p>
      ${this.searching ? html`<p class="to-hint" role="status">${t('Searching…')}</p>` : nothing}
      ${this.found
        ? this.found.length
          ? html`<ul class="trip-found" aria-label=${t('Places found')}>
              ${this.found.map((p) => html`<li><button type="button" @click=${() => this.choose(p)}><b>${p.name}</b><span>${p.detail}</span></button></li>`)}
            </ul>`
          : html`<p class="to-hint" role="status">${t('Nothing found.')}</p>`
        : nothing}`;
  }
  render() {
    const v = this.view;
    const n = v.stops.length;
    const total = n > 1 && v.linked ? formatLeg(routeKm(v.stops), v.units) : '';
    return html`<to-bar class="trip-bar">
        <to-insert .items=${this.inserts()}></to-insert>
        <to-menu class="trip-units" icon-only .label=${t('Measure in')} .icon=${Ruler} .items=${this.unitItems()}></to-menu>
        ${tool({ label: t('Join the stops in order'), icon: Spline, pressed: v.linked, does: () => this.edit(setLinked(this.doc, !v.linked)) })}
        ${tool({ label: t('Show the whole route'), icon: Scan, disabled: !n || !this.showMap, does: () => this.fit() })}
        ${tool({ label: t('Map'), icon: MapIcon, pressed: this.showMap, does: () => (this.showMap = !this.showMap) })}
        ${tool({ label: t('Undo'), icon: UI.undo, keys: 'Mod+Z', keep: true, disabled: !this.canUndo, does: () => this.dispatchEvent(new CustomEvent('docundo', { cancelable: true })) })}
        ${tool({ label: t('Redo'), icon: UI.redo, keys: 'Mod+Shift+Z', keep: true, disabled: !this.canRedo, does: () => this.dispatchEvent(new CustomEvent('docredo', { cancelable: true })) })}
        <span class="to-hint trip-count">${t('{n|one stop|# stops}', { n })}${total ? html` · <b>${total}</b>` : nothing}</span>
      </to-bar>
      <div class="trip ${this.showMap ? '' : 'no-map'}">
        ${this.showMap
          ? html`<div class="trip-side">
              <div class="trip-map" role="region" aria-label=${t('Map: tap to add a stop')}></div>
              <p class="to-hint trip-privacy">${t('The map’s pictures come from OpenStreetMap while it is shown.')}</p>
            </div>`
          : nothing}
        ${n
          ? html`<ol class="trip-stops" aria-label=${t('Stops')}>${v.stops.map((s, i) => this.row(s, i))}</ol>`
          : html`<p class="to-hint trip-empty">${this.showMap ? t('Tap the map to add the first stop, or Insert a place by name.') : t('Insert a place by name.')}</p>`}
      </div>
      <to-menu class="trip-rowmenu" .label=${t('Stop')} .items=${this.rowItems()}></to-menu>
      <to-dialog class="trip-find" heading=${t('A place by name')} .body=${this.findBody()}></to-dialog>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToTripEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-trip-editor': ToTripEditor;
  }
}
