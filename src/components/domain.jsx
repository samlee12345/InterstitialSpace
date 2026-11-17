import { Link } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Badge, ImageBox, Mine, PointsBadge, StatusBadges } from './ui.jsx';

// number: position in the current list (matches the map pin). voteRank: rank by community votes.
export function SpaceCard({ space, faded, number, voteRank, active, onHover }) {
  return (
    <Link
      to={`/space/${space.id}`}
      className={`card card-link ${faded ? 'faded' : ''} ${active ? 'card-active' : ''}`}
      tabIndex={faded ? -1 : undefined}
      aria-hidden={faded || undefined}
      onMouseEnter={() => onHover?.(space.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(space.id)}
      onBlur={() => onHover?.(null)}
    >
      <ImageBox label={`Photo: ${space.type}`} />
      <div className="row">
        {number && <span className="pin pin-inline" aria-hidden="true">{number}</span>}
        {voteRank && <Badge>No. {voteRank} by votes</Badge>}
        <StatusBadges space={space} />
      </div>
      <h3>{space.name}</h3>
      <p className="small muted">
        <span className="bold">{space.votes} votes</span>, {space.photos.length} photos, {space.type}
      </p>
    </Link>
  );
}

// Map placeholder: pins are placed from each space's lat/lng and numbered like the list.
export function MapBox({ spaces, hiddenIds = [], activeId, onHover, sticky }) {
  const lats = spaces.map((s) => s.lat);
  const lngs = spaces.map((s) => s.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const pos = (s) => ({
    left: `${8 + ((s.lng - minLng) / (maxLng - minLng || 1)) * 84}%`,
    top: `${90 - ((s.lat - minLat) / (maxLat - minLat || 1)) * 78}%`,
  });
  return (
    <div className={`map ${sticky ? 'map-sticky' : ''}`}>
      <span className="map-label">Map placeholder: Jaipur. Dashed pins are pending.</span>
      {spaces.map((s, i) =>
        hiddenIds.includes(s.id) ? (
          <span key={s.id} className="pin faded" style={pos(s)} aria-hidden="true">?</span>
        ) : (
          <Link
            key={s.id}
            to={`/space/${s.id}`}
            className={`pin ${s.status !== 'approved' ? 'pin-pending' : ''} ${activeId === s.id ? 'pin-active' : ''}`}
            style={pos(s)}
            title={s.name}
            aria-label={`${i + 1}: ${s.name}`}
            onMouseEnter={() => onHover?.(s.id)}
            onMouseLeave={() => onHover?.(null)}
          >
            {i + 1}
          </Link>
        ),
      )}
    </div>
  );
}

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
