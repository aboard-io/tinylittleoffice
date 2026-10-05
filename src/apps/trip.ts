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
import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { icon, UI } from '../lib/icons.ts';
import { MAX_STOPS, UNITS, distanceKm, formatLeg, parseTrip, routeKm, serializeTrip, tripUnits, type Stop, type Units } from '../lib/tripmodel.ts';
import type { SlSelect } from '../lib/shoelace.ts';
import type { SlInput } from '../lib/shoelace.ts';

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const SEARCH = 'https://nominatim.openstreetmap.org/search';

interface Place {
  name: string;
  detail: string;
  lat: number;
  lon: number;
}

@customElement('to-trip')
export class ToTrip extends LitElement {
  @property() value = '';
  /** Shown on a slide: just the map, which goes to stop `step` (0 shows the whole route). */
  @property({ type: Boolean, reflect: true }) present = false;
  @property({ type: Number }) step = 0;
  @state() private units: Units = 'h';
  @state() private stops: Stop[] = [];
  @state() private cur = -1;
  @state() private query = '';
  @state() private places: Place[] | null = null;
  @state() private searching = false;
  private lastEmitted = '';
  private map: L.Map | null = null;
  private layer = L.layerGroup();
  private resize: ResizeObserver | null = null;
  private refit = true;

  createRenderRoot() {
    return this;
  }

  willUpdate(changed: PropertyValues) {
    if (changed.has('value') && this.value !== this.lastEmitted) {
      this.stops = parseTrip(this.value);
      this.units = tripUnits(this.value);
      this.lastEmitted = this.value;
      this.cur = -1;
      this.refit = true;
    }
  }

  firstUpdated() {
    const el = this.querySelector<HTMLElement>('.trip-map')!;
    const map = L.map(el, { zoomControl: true, worldCopyJump: true }).setView([25, 0], 2);
    L.tileLayer(TILES, { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
    this.layer.addTo(map);
    map.on('click', (e) => !this.present && this.addStop(e.latlng.lat, e.latlng.wrap().lng));
    this.map = map;
    this.resize = new ResizeObserver(() => map.invalidateSize());
    this.resize.observe(el);
    this.draw();
  }

  updated(changed: PropertyValues) {
    if (changed.has('stops') || changed.has('cur')) this.draw();
    if (this.present && (changed.has('step') || changed.has('stops'))) this.goTo(this.step);
  }

  /** Presenting: fly to a stop and say what it is. */
  private goTo(step: number) {
    const map = this.map;
    const stop = this.stops[step - 1];
    if (!map) return;
    map.closePopup();
    if (!stop) return this.fit();
    map.flyTo([stop.lat, stop.lon], 12, { duration: 1.2 });
    const p = document.createElement('div');
    p.append(Object.assign(document.createElement('b'), { textContent: `${step}. ${stop.name || 'Stop'}` }));
    if (stop.note) p.append(document.createElement('br'), stop.note);
    L.popup({ closeButton: false, offset: [0, -10] }).setLatLng([stop.lat, stop.lon]).setContent(p).openOn(map);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resize?.disconnect();
    this.map?.remove();
    this.map = null;
  }

  private commit(stops: Stop[], units = this.units) {
    this.stops = stops;
    this.units = units;
    this.lastEmitted = serializeTrip(stops, units);
    this.dispatchEvent(new CustomEvent('docchange', { detail: this.lastEmitted, bubbles: true, composed: true }));
  }

  private patch(i: number, p: Partial<Stop>) {
    this.commit(this.stops.map((s, j) => (j === i ? { ...s, ...p } : s)));
  }

  private addStop(lat: number, lon: number, name = '') {
    if (this.stops.length >= MAX_STOPS) return;
    const round = (n: number) => Math.round(n * 1e5) / 1e5;
    this.commit([...this.stops, { lat: round(lat), lon: round(lon), name, note: '' }]);
    this.cur = this.stops.length - 1;
    this.updateComplete.then(() => this.querySelector<HTMLInputElement>('.trip-stops li:last-child input.name')?.focus({ preventScroll: false }));
  }

  private move(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= this.stops.length) return;
    const stops = [...this.stops];
    [stops[i], stops[j]] = [stops[j], stops[i]];
    this.commit(stops);
    this.cur = j;
  }

  /** Redraw the markers and the line between them. */
  private draw() {
    const map = this.map;
    if (!map) return;
    this.layer.clearLayers();
    const pts = this.stops.map((s) => L.latLng(s.lat, s.lon));
    if (pts.length > 1) L.polyline(pts, { color: '#4f46e5', weight: 4, opacity: 0.85 }).addTo(this.layer);
    this.stops.forEach((s, i) => {
      const marker = L.marker(pts[i], {
        draggable: !this.present,
        title: s.name || `Stop ${i + 1}`,
        icon: L.divIcon({ className: `trip-pin ${i === this.cur ? 'sel' : ''}`, html: String(i + 1), iconSize: [28, 28], iconAnchor: [14, 14] }),
      });
      marker.on('click', () => {
        this.cur = i;
        this.querySelector(`.trip-stops li:nth-child(${i + 1})`)?.scrollIntoView({ block: 'nearest' });
      });
      marker.on('dragend', () => {
        const p = marker.getLatLng().wrap();
        this.patch(i, { lat: Math.round(p.lat * 1e5) / 1e5, lon: Math.round(p.lng * 1e5) / 1e5 });
      });
      marker.addTo(this.layer);
    });
    if (this.refit) {
      this.refit = false;
      this.fit(false);
    }
  }

  private fit(animate = true) {
    const map = this.map;
    if (!map || !this.stops.length) return;
    if (this.stops.length === 1) map.setView([this.stops[0].lat, this.stops[0].lon], 12, { animate });
    else map.fitBounds(L.latLngBounds(this.stops.map((s) => [s.lat, s.lon] as [number, number])), { padding: [36, 36], animate });
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
    this.updateComplete.then(() => this.querySelector<HTMLInputElement>(`.trip-stops li:nth-child(${this.cur + 1}) input.name`)?.focus());
  }

  render() {
    const n = this.stops.length;
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
        <span class="to-hint">${n} ${n === 1 ? 'stop' : 'stops'}${n > 1 ? html` · <b>${formatLeg(routeKm(this.stops), this.units)}</b>` : nothing}</span>
        <sl-select class="sr-label trip-units" size="small" label="Measure in" hoist .value=${this.units} @sl-change=${(e: Event) => this.commit(this.stops, (e.target as SlSelect).value as Units)}>
          ${UNITS.map((u) => html`<sl-option value=${u.id}>${u.name}</sl-option>`)}
        </sl-select>
        <sl-tooltip content="Show the whole route" hoist><sl-button class="icon" size="small" aria-label="Show the whole route" ?disabled=${!n} @click=${() => this.fit()}>${icon(UI.frame, 14)}<span class="sr-only">Show the whole route</span></sl-button></sl-tooltip>
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
          ${this.stops.map(
            (s, i) => html`<li class=${i === this.cur ? 'sel' : ''} @focusin=${() => (this.cur = i)} @keydown=${(e: KeyboardEvent) => this.onStopKey(e, i)}>
              ${i > 0 ? html`<span class="leg">${this.units === 'h' ? '≈ ' : ''}${formatLeg(distanceKm(this.stops[i - 1], s), this.units)}${this.units === 'h' ? ' drive' : ''}</span>` : nothing}
              <span class="n">${i + 1}</span>
              <input class="name" aria-label="Name of stop ${i + 1}" placeholder="Stop ${i + 1}" .value=${s.name} @input=${(e: Event) => this.patch(i, { name: (e.target as HTMLInputElement).value })} />
              <div class="acts">
                <button aria-label="Move stop ${i + 1} earlier" ?disabled=${i === 0} @click=${() => this.move(i, -1)}>${icon(UI.up, 14)}</button>
                <button aria-label="Move stop ${i + 1} later" ?disabled=${i === n - 1} @click=${() => this.move(i, 1)}>${icon(UI.down, 14)}</button>
                <button aria-label="Delete stop ${i + 1}" @click=${() => this.commit(this.stops.filter((_, j) => j !== i))}>${icon(UI.close, 14)}</button>
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
