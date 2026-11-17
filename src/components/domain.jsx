import { Link } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Badge, Icon, ImageBox, Mine, PointsBadge, StatusBadges } from './ui.jsx';
import { useChoices } from '../design/choices.js';

// Space card layouts to compare in the sandbox. The chosen one is in design/choices.js.
export const SPACE_CARD_VARIANTS = {
  label: { name: 'Type on the photo', note: 'Type sits on the photo as a label, so the text below is just the name and two counts. Scans fast in a grid.' },
  footer: { name: 'Counts in a footer', note: 'Type is a plain line under the name; votes and photos get their own footer with larger numbers. Best when counts matter most.' },
  votes: { name: 'Votes lead', note: 'Vote count sits beside the name as the card’s anchor, like a ranked list. Makes it obvious which spaces people care about.' },
  row: { name: 'Compact row', note: 'Small photo on the left, text on the right. Fits twice as many spaces in the list beside the map.' },
};

export const typeLabel = (t) => t.charAt(0).toUpperCase() + t.slice(1);

function Stat({ icon, n, label }) {
  return (
    <span className="stat">
      <Icon name={icon} />
      <span><span className="bold">{n}</span> {label}</span>
    </span>
  );
}

// headingLevel keeps the page outline correct (h2 under an h1, h3 under an h2).
export function SpaceCard({ space, faded, active, onHover, headingLevel = 3, variant }) {
  const { spaceCard } = useChoices();
  const { state } = useDemo();
  const nRedesigns = state.redesigns.filter((r) => r.spaceId === space.id && r.published && !r.takenDown).length;
  const v = SPACE_CARD_VARIANTS[variant] ? variant : spaceCard;
  const H = `h${headingLevel}`;
  const votes = <Stat icon="vote" n={space.votes} label={space.votes === 1 ? 'vote' : 'votes'} />;
  const photos = <Stat icon="photo" n={space.photos.length} label={space.photos.length === 1 ? 'photo' : 'photos'} />;
  const redesigns = <Stat icon="redesign" n={nRedesigns} label={nRedesigns === 1 ? 'redesign' : 'redesigns'} />;
  const badges = <StatusBadges space={space} />;
  const hasBadges = space.status !== 'approved' || space.readyForApproval || space.removal === 'review';

  let body;
  if (v === 'footer') {
    body = (
      <>
        <ImageBox label="Photo" />
        {hasBadges && <div className="row">{badges}</div>}
        <div className="stack-sm">
          <H className="card-title">{space.name}</H>
          <span className="small muted">{typeLabel(space.type)}</span>
        </div>
        <dl className="card-foot">
          <div><dt>Votes</dt><dd>{space.votes}</dd></div>
          <div><dt>Redesigns</dt><dd>{nRedesigns}</dd></div>
          <div><dt>Photos</dt><dd>{space.photos.length}</dd></div>
        </dl>
      </>
    );
  } else if (v === 'votes') {
    body = (
      <>
        <ImageBox label="Photo" />
        <div className="vote-lead">
          <span className="vote-box" aria-label={`${space.votes} votes`}>
            <Icon name="vote" />
            <span className="bold">{space.votes}</span>
          </span>
          <div className="stack-sm grow">
            <H className="card-title">{space.name}</H>
            <span className="small muted">{typeLabel(space.type)}, {nRedesigns} {nRedesigns === 1 ? 'redesign' : 'redesigns'}, {space.photos.length} photos</span>
            {hasBadges && <div className="row">{badges}</div>}
          </div>
        </div>
      </>
    );
  } else if (v === 'row') {
    body = (
      <div className="card-row">
        <div className="card-row-img"><ImageBox label="Photo" shape="square" /></div>
        <div className="stack-sm grow">
          <H className="card-title">{space.name}</H>
          <div className="row"><Badge>{typeLabel(space.type)}</Badge>{badges}</div>
          <div className="row small stats">{votes}{redesigns}{photos}</div>
        </div>
      </div>
    );
  } else {
    body = (
      <>
        <div className="img-labelled">
          <ImageBox label="Photo" />
          <span className="img-label">{typeLabel(space.type)}</span>
        </div>
        {hasBadges && <div className="row">{badges}</div>}
        <H className="card-title">{space.name}</H>
        <div className="row small stats">{votes}{redesigns}{photos}</div>
      </>
    );
  }

  return (
    <Link
      to={`/space/${space.id}`}
      className={`card card-link card-${v} ${faded ? 'faded' : ''} ${active ? 'card-active' : ''}`}
      tabIndex={faded ? -1 : undefined}
      aria-hidden={faded || undefined}
      onMouseEnter={() => onHover?.(space.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(space.id)}
      onBlur={() => onHover?.(null)}
    >
      {body}
    </Link>
  );
}

// Distance in metres between two lat/lng points (haversine).
export function distanceM(a, b) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const ZOOM_SPAN = 0.0016; // degrees shown either side of a focused point (about 170 m)

// Map placeholder. Pins are plain markers: solid for approved, dashed and hollow for pending.
// `area` sets the extent when nothing is focused, so an empty filter keeps the same map.
// `focus` ({ lat, lng }) zooms in around a point. With `onPinClick`, pins are buttons
// that select a space (map landing); without it they link to the space page (Browse).
// `me` draws a "you are here" marker.
export function MapBox({ spaces, area, hiddenIds = [], activeId, selectedId, onHover, onPinClick, focus, me, sticky, className = '', label = 'Map placeholder: Jaipur. Dashed pins are pending.', children }) {
  const extent = area?.length ? area : spaces;
  let [minLat, maxLat, minLng, maxLng] = [Math.min(...extent.map((s) => s.lat)), Math.max(...extent.map((s) => s.lat)), Math.min(...extent.map((s) => s.lng)), Math.max(...extent.map((s) => s.lng))];
  if (focus) [minLat, maxLat, minLng, maxLng] = [focus.lat - ZOOM_SPAN, focus.lat + ZOOM_SPAN, focus.lng - ZOOM_SPAN * 1.6, focus.lng + ZOOM_SPAN * 1.6];
  // Grid scale while zoomed: a hint of magnification, capped so cells stay readable.
  const zoom = focus ? 2.5 : 1;
  const xy = (p) => ({
    x: 8 + ((p.lng - minLng) / (maxLng - minLng || 1)) * 84,
    y: 90 - ((p.lat - minLat) / (maxLat - minLat || 1)) * 72,
  });
  const placed = [];
  const pos = spaces.map((s) => {
    let { x, y } = xy(s);
    // Nudge apart pins that would overlap (in % of the map).
    for (let i = 0; i < 6 && placed.some((p) => Math.abs(p.x - x) < 2.5 && Math.abs(p.y - y) < 3.5); i += 1) { x += 2; y += 2.5; }
    placed.push({ x, y });
    return { left: `${x}%`, top: `${y}%` };
  });
  const status = (s) => (s.status === 'approved' ? 'approved' : 'pending');
  const meXY = me && xy(me);
  return (
    <div className={`map ${sticky ? 'map-sticky' : ''} ${className}`} style={{ '--map-zoom': zoom }}>
      {label && <span className="map-label">{label}</span>}
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
      {meXY && <span className="pin-me" style={{ left: `${meXY.x}%`, top: `${meXY.y}%` }} role="img" aria-label="Your location" />}
      {children}
    </div>
  );
}

// Text search across a space's name, type and what people said about it.
export const matchesSearch = (space, q) => {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const hay = [space.name, space.type, ...Object.values(space.questionnaire || {}), ...Object.values(space.properties || {})].join(' ').toLowerCase();
  return t.split(/\s+/).every((w) => hay.includes(w));
};

export function RedesignCard({ redesign, blurred }) {
  const { get, cfg } = useDemo();
  const a = get.user(redesign.architectId);
  const body = (
    <>
      <ImageBox label="Redesign preview" />
      <div className="row"><Mine userId={a.id} /></div>
      <h3>{redesign.title}</h3>
      <p className="small muted">by {a.name}</p>
      <div className="row between">
        <span className="bold">{cfg.priceLabel}</span>
        <span className="row"><PointsBadge userId={a.id} /></span>
      </div>
    </>
  );
  if (blurred) return <div className="card blur" aria-hidden="true">{body}</div>;
  return <Link to={`/item/${redesign.id}`} className="card card-link">{body}</Link>;
}

export const contestStatus = (c) => (c.status === 'live' ? 'Open for entries' : c.status === 'judging' ? 'Judging' : 'Closed');

export function ContestCard({ contest }) {
  const { get } = useDemo();
  const sp = get.space(contest.spaceId);
  return (
    <Link to={`/contest/${contest.id}`} className="card card-link">
      <div className="row"><Badge kind={contest.status === 'live' ? 'solid' : ''}>{contestStatus(contest)}</Badge></div>
      <h3>{contest.title}</h3>
      <p><span className="display-sm">{contest.prize}</span> <span className="small muted">prize</span></p>
      <p className="small muted">Site: {sp?.name}</p>
      <dl className="dl">
        <dt>Deadline</dt><dd>{contest.deadline}</dd>
        <dt>Co-host</dt><dd>{contest.coHost}</dd>
        <dt>Entries</dt><dd>{contest.entries.length}</dd>
      </dl>
    </Link>
  );
}

export function Crumbs({ items }) {
  return (
    <nav className="small row" aria-label="Breadcrumb">
      {items.map(([to, label], i) => (
        <span key={label} className="row">
          {i > 0 && <span className="muted">/</span>}
          {to ? <Link to={to}>{label}</Link> : <span className="muted">{label}</span>}
        </span>
      ))}
    </nav>
  );
}
