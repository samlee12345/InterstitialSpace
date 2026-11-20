// A real map (round 21): Leaflet with light grey CARTO tiles on OpenStreetMap data.
// It keeps the old placeholder map's props, so the landing page, Browse and the
// contest space picker work unchanged. Pins are still our own buttons and links,
// drawn over the map at each space's real coordinates, so they keep their names,
// focus styles and hover links to the list.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';

const TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';
const FOCUS_ZOOM = 17; // a selected space: street level
const NUDGE_PX = 20; // pins closer than this (including their larger tap area) are nudged apart

const boundsOf = (points) => L.latLngBounds(points.map((p) => [p.lat, p.lng]));

export function MapBox({ spaces, area, hiddenIds = [], activeId, selectedId, onHover, onPinClick, focus, me, areaM, onMapClick, meLabel = 'Your location', sticky, className = '', label = 'Dashed pins are pending.', children }) {
  const el = useRef(null);
  const map = useRef(null);
  const circle = useRef(null);
  const clickRef = useRef(onMapClick);
  const [, setTick] = useState(0);
  clickRef.current = onMapClick;
  const extent = area?.length ? area : spaces;
  const extentKey = extent.map((s) => s.id).join(',');

  // Create the map once.
  useLayoutEffect(() => {
    const m = L.map(el.current, { zoomControl: false, scrollWheelZoom: false, attributionControl: true });
    L.tileLayer(TILES, { attribution: ATTRIBUTION, subdomains: 'abcd', maxZoom: 19 }).addTo(m);
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    m.attributionControl.setPrefix(false);
    if (extent.length) m.fitBounds(boundsOf(extent), { padding: [40, 40] });
    else m.setView([26.9196, 75.8167], 14);
    const redraw = () => setTick((t) => t + 1);
    m.on('move zoom resize viewreset', redraw);
    m.on('click', (e) => clickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    redraw();
    return () => {
      ro.disconnect();
      map.current = null;
      m.off('move zoom resize viewreset click');
      // A zoom animation can still be finishing; removing the map under it throws in
      // Leaflet. The element is already detached, so remove the map once it settles.
      m.stop();
      setTimeout(() => { try { m.remove(); } catch { /* already gone */ } }, 400);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Zoom to a selected space, back out to the whole area, or include a searched point.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (focus) m.setView([focus.lat, focus.lng], FOCUS_ZOOM, { animate: true });
    else if (extent.length) m.fitBounds(boundsOf(me ? [...extent, me] : extent), { padding: [40, 40], animate: true });
  }, [focus?.lat, focus?.lng, extentKey, me?.lat, me?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // The search area around a point, drawn to scale.
  useEffect(() => {
    const m = map.current;
    if (!m) return undefined;
    if (me && areaM) {
      circle.current = L.circle([me.lat, me.lng], { radius: areaM, color: '#151515', weight: 2, dashArray: '6 6', fillOpacity: 0.08, interactive: false }).addTo(m);
    }
    return () => { circle.current?.remove(); circle.current = null; };
  }, [me?.lat, me?.lng, areaM]); // eslint-disable-line react-hooks/exhaustive-deps

  const m = map.current;
  const px = (p) => (m ? m.latLngToContainerPoint([p.lat, p.lng]) : { x: -100, y: -100 });
  const placed = [];
  const pos = spaces.map((s) => {
    let { x, y } = px(s);
    for (let i = 0; i < 6 && placed.some((p) => Math.abs(p.x - x) < NUDGE_PX && Math.abs(p.y - y) < NUDGE_PX); i += 1) { x += 18; y += 10; }
    placed.push({ x, y });
    return { left: `${x}px`, top: `${y}px` };
  });
  const status = (s) => (s.status === 'approved' ? 'approved' : 'pending');
  const meXY = me && px(me);

  return (
    <div className={`map map-real ${sticky ? 'map-sticky' : ''} ${onMapClick ? 'map-clickable' : ''} ${className}`}>
      <div ref={el} className="map-canvas" aria-label="Map of Jaipur" />
      <div className="map-pins">
        {spaces.map((s, i) => {
          if (hiddenIds.includes(s.id)) return <span key={s.id} className="pin faded" style={pos[i]} aria-hidden="true" />;
          const cls = `pin pin-${status(s)} ${activeId === s.id ? 'pin-active' : ''} ${selectedId === s.id ? 'pin-selected' : ''}`;
          const name = `${s.name}, ${status(s)}, ${s.votes} votes`;
          const hover = { onMouseEnter: () => onHover?.(s.id), onMouseLeave: () => onHover?.(null), onFocus: () => onHover?.(s.id), onBlur: () => onHover?.(null) };
          return onPinClick ? (
            <button key={s.id} type="button" className={cls} style={pos[i]} title={s.name} aria-label={name} aria-pressed={selectedId === s.id} onClick={() => onPinClick(s)} {...hover} />
          ) : (
            <Link key={s.id} to={`/space/${s.id}`} className={cls} style={pos[i]} title={s.name} aria-label={name} {...hover} />
          );
        })}
        {meXY && <span className="pin-me" style={{ left: `${meXY.x}px`, top: `${meXY.y}px` }} role="img" aria-label={meLabel} />}
      </div>
      {label && <span className="map-label">{label}</span>}
      {children}
    </div>
  );
}
