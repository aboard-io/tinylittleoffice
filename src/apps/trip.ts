/**
 * <to-trip>: a route on an OpenStreetMap map. Tap the map (or search for a
 * place) to add a stop; each stop has a name and a note. Stops are joined in
 * order by straight lines, so distances are as the crow flies.
 * Document format: see lib/tripmodel.ts.
 *
 * This is the one app that talks to the network: map tiles come from
 * openstreetmap.org and searches go to its Nominatim service. The route
 * itself still lives only in the URL.
 */
import type * as Leaflet from 'leaflet';
import { DocElement, defineElement, html, nothing, state, property, btn, tool, icon, swap, UI, type PropertyValues, type SlInput, type SlSelect } from '../kit.ts';
import { MAX_STOPS, UNITS, distanceKm, formatLeg, parseTrip, routeKm, serializeTrip, tripUnits, type Stop, type Units } from '../lib/tripmodel.ts';

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// The map library is the one large thing only one app needs, so it arrives with the first map, not with the site.
let L: typeof Leaflet;
let loading: Promise<void> | null = null;
const leaflet = () => (loading ??= Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(([m]) => void (L = m.default)));
const SEARCH = 'https://nominatim.openstreetmap.org/search';
/** Degrees to five places, about a metre, as the document keeps them. */
const deg = (n: number) => Math.round(n * 1e5) / 1e5;

interface Place {
  name: string;
  detail: string;
  lat: number;
  lon: number;
}

/** The document as the editor works with it: the stops, and the unit the legs are given in. */
interface Trip {
  stops: Stop[];
  units: Units;
}

export class ToTrip extends DocElement<Trip> {
  /** Shown on a slide: just the map, which goes to stop `step` (0 shows the whole route). */
  @property({ type: Boolean, reflect: true }) present = false;
  @property({ type: Number }) step = 0;
  @state() private cur = -1;
  @state() private query = '';
  @state() private places: Place[] | null = null;
  @state() private searching = false;
  private map: Leaflet.Map | null = null;
  private layer: Leaflet.LayerGroup | null = null;
  private resize: ResizeObserver | null = null;
  private refit = true;
  /** The stops as last drawn, so a render that changed nothing else leaves the map alone. */
  private drawn: Stop[] | null = null;

  protected parse = (text: string): Trip => ({ stops: parseTrip(text), units: tripUnits(text) });
  protected serialize = (t: Trip) => serializeTrip(t.stops, t.units);

  protected loaded() {
    this.cur = -1;
    this.refit = true;
  }

  async firstUpdated() {
    await leaflet();
    const el = this.querySelector<HTMLElement>('.trip-map');
    if (!el || !this.isConnected) return;
    const map = L.map(el, { zoomControl: true, worldCopyJump: true }).setView([25, 0], 2);
    L.tileLayer(TILES, { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
    this.layer = L.layerGroup().addTo(map);
    map.on('click', (e) => !this.present && this.addStop(e.latlng.lat, e.latlng.wrap().lng));
    this.map = map;
    this.resize = new ResizeObserver(() => map.invalidateSize());
    this.resize.observe(el);
    this.draw();
  }

  updated(changed: PropertyValues) {
    const moved = this.doc.stops !== this.drawn;
    if (moved || changed.has('cur')) this.draw();
    if (this.present && (changed.has('step') || moved)) this.goTo(this.step);
  }

  /** Presenting: fly to a stop and say what it is. */
  private goTo(step: number) {
    const map = this.map;
    const stop = this.doc.stops[step - 1];
    if (!map) return;
    map.closePopup();
    if (!stop) return this.fit();
    map.flyTo([stop.lat, stop.lon], 12, { duration: 1.2 });
    const p = document.createElement('div');
    p.append(Object.assign(document.createElement('b'), { textContent: `${step}. ${stop.name}`.trimEnd() }));
    if (stop.note) p.append(document.createElement('br'), stop.note);
    L.popup({ closeButton: false, offset: [0, -10] }).setLatLng([stop.lat, stop.lon]).setContent(p).openOn(map);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resize?.disconnect();
    this.map?.remove();
    this.map = null;
  }

  private save(stops: Stop[], units = this.doc.units) {
    this.commit({ stops, units });
  }

  private patch(i: number, p: Partial<Stop>) {
    this.save(this.doc.stops.map((s, j) => (j === i ? { ...s, ...p } : s)));
  }

  private addStop(lat: number, lon: number, name = '') {
    if (this.doc.stops.length >= MAX_STOPS) return;
    this.save([...this.doc.stops, { lat: deg(lat), lon: deg(lon), name, note: '' }]);
    this.cur = this.doc.stops.length - 1;
    this.focusSoon('.trip-stops li:last-child input.name');
  }

  private move(i: number, d: number) {
    const stops = swap(this.doc.stops, i, i + d);
    if (stops === this.doc.stops) return;
    this.save(stops);
    this.cur = i + d;
  }

  /** Redraw the markers and the line between them. */
  private draw() {
    const layer = this.layer;
    if (!this.map || !layer) return;
    this.drawn = this.doc.stops;
    layer.clearLayers();
    const pts = this.doc.stops.map((s) => L.latLng(s.lat, s.lon));
    if (pts.length > 1) L.polyline(pts, { color: '#4f46e5', weight: 4, opacity: 0.85 }).addTo(layer);
    this.doc.stops.forEach((s, i) => {
      const marker = L.marker(pts[i], {
        draggable: !this.present,
        title: s.name || String(i + 1),
        icon: L.divIcon({ className: `trip-pin ${i === this.cur ? 'sel' : ''}`, html: String(i + 1), iconSize: [28, 28], iconAnchor: [14, 14] }),
      });
      marker.on('click', () => {
        this.cur = i;
        this.querySelector(`.trip-stops li:nth-child(${i + 1})`)?.scrollIntoView({ block: 'nearest' });
      });
      marker.on('dragend', () => {
        const p = marker.getLatLng().wrap();
        this.patch(i, { lat: deg(p.lat), lon: deg(p.lng) });
      });
      marker.addTo(layer);
    });
    if (this.refit) {
      this.refit = false;
      this.fit(false);
    }
  }

  private fit(animate = true) {
    const map = this.map;
    if (!map || !this.doc.stops.length) return;
    if (this.doc.stops.length === 1) map.setView([this.doc.stops[0].lat, this.doc.stops[0].lon], 12, { animate });
    else map.fitBounds(L.latLngBounds(this.doc.stops.map((s) => [s.lat, s.lon] as [number, number])), { padding: [36, 36], animate });
  }

  private async search() {
    const q = this.query.trim();
    if (!q || this.searching) return;
    this.searching = true;
    try {
      const res = await fetch(`${SEARCH}?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
      const rows = (await res.json()) as { name?: string; display_name: string; lat: string; lon: string }[];
      this.places = rows.map((r) => ({ name: r.name || r.display_name.split(',')[0], detail: r.display_name, lat: parseFloat(r.lat), lon: parseFloat(r.lon) }));
    } catch {
      this.places = [];
    } finally {
      this.searching = false;
    }
  }

  private pick(p: Place) {
    this.addStop(p.lat, p.lon, p.name);
    this.places = null;
    this.query = '';
    this.map?.setView([p.lat, p.lon], Math.max(this.map.getZoom(), 11));
  }

  private onStopKey(e: KeyboardEvent, i: number) {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    this.move(i, e.key === 'ArrowUp' ? -1 : 1);
    this.focusSoon(`.trip-stops li:nth-child(${this.cur + 1}) input.name`);
  }

  render() {
    const n = this.doc.stops.length;
    if (this.present) return html`<div class="trip-map" role="application" aria-label="Map"></div>`;
    return html`
      <div class="to-toolbar">
        <sl-input
          class="trip-search sr-label"
          size="small"
          type="search"
          label="Find a place"
          placeholder="Find a place"
          clearable
          .value=${this.query}
          @sl-input=${(e: Event) => (this.query = (e.target as SlInput).value)}
          @sl-clear=${() => (this.places = null)}
          @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.search()}
        ><span slot="prefix">${icon(UI.search, 14)}</span></sl-input>
        <sl-button size="small" ?loading=${this.searching} ?disabled=${!this.query.trim()} @click=${this.search}>Search</sl-button>
        <span class="to-spacer"></span>
        <span class="to-hint">${n} ${n === 1 ? 'stop' : 'stops'}${n > 1 ? html` · <b>${formatLeg(routeKm(this.doc.stops), this.doc.units)}</b>` : nothing}</span>
        <sl-select class="sr-label trip-units" size="small" label="Measure in" hoist .value=${this.doc.units} @sl-change=${(e: Event) => this.save(this.doc.stops, (e.target as SlSelect).value as Units)}>
          ${UNITS.map((u) => html`<sl-option value=${u.id}>${u.name}</sl-option>`)}
        </sl-select>
        ${tool('Show the whole route', 'frame', () => this.fit(), { disabled: !n })}
      </div>
      ${this.places
        ? html`<ul class="trip-places" aria-label="Places found">
            ${this.places.map((p) => html`<li><button @click=${() => this.pick(p)}>${icon(UI.pin, 14)}<b>${p.name}</b><span>${p.detail}</span></button></li>`)}
            ${this.places.length ? nothing : html`<li class="to-hint">Nothing found.</li>`}
          </ul>`
        : nothing}
      <div class="trip">
        <div class="trip-map" role="application" aria-label="Map"></div>
        <ol class="trip-stops" aria-label="Stops">
          ${this.doc.stops.map(
            (s, i) => html`<li class=${i === this.cur ? 'sel' : ''} @focusin=${() => (this.cur = i)} @keydown=${(e: KeyboardEvent) => this.onStopKey(e, i)}>
              ${i > 0 ? html`<span class="leg">${this.doc.units === 'h' ? '≈ ' : ''}${formatLeg(distanceKm(this.doc.stops[i - 1], s), this.doc.units)}${this.doc.units === 'h' ? ' drive' : ''}</span>` : nothing}
              <span class="n">${i + 1}</span>
              <input class="name" aria-label="Name of stop ${i + 1}" placeholder="Name" .value=${s.name} @input=${(e: Event) => this.patch(i, { name: (e.target as HTMLInputElement).value })} />
              <div class="acts">
                ${btn(`Move stop ${i + 1} earlier`, 'up', () => this.move(i, -1), { disabled: i === 0 })}
                ${btn(`Move stop ${i + 1} later`, 'down', () => this.move(i, 1), { disabled: i === n - 1 })}
                ${btn(`Delete stop ${i + 1}`, 'close', () => this.save(this.doc.stops.filter((_, j) => j !== i)))}
              </div>
              <textarea rows="2" aria-label="Note for stop ${i + 1}" placeholder="Note" .value=${s.note} @input=${(e: Event) => this.patch(i, { note: (e.target as HTMLTextAreaElement).value })}></textarea>
            </li>`,
          )}
          ${n ? nothing : html`<li class="to-empty">Tap the map to add the first stop.</li>`}
        </ol>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-trip': ToTrip;
  }
}
defineElement('trip', ToTrip);
