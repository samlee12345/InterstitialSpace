import { useState } from 'react';
import { Link } from 'react-router-dom';
import { areaM2, radiusOf, shapeOf, toXY } from '../lib/geo.js';
import { useDemo } from '../state/DemoContext.jsx';
import { gatheringOf } from '../lib/gathering.js';
import { Badge, Button, FormActions, Icon, ImageBox, Mine, Modal, Opt, PointsBadge, StatusBadges } from './ui.jsx';
import { useChoices } from '../design/choices.js';

// Space card layouts to compare in the sandbox. The chosen one is in design/choices.js.
export const SPACE_CARD_VARIANTS = {
  label: { name: 'Type on the photo', note: 'Type sits on the photo as a label, so the text below is just the name and two counts. Scans fast in a grid.' },
  footer: { name: 'Counts in a footer', note: 'Type is a plain line under the name; votes and photos get their own footer with larger numbers. Best when counts matter most.' },
  votes: { name: 'Votes lead', note: 'Vote count sits beside the name as the card’s anchor, like a ranked list. Makes it obvious which spaces people care about.' },
  row: { name: 'Compact row', note: 'Small photo on the left, text on the right. Fits twice as many spaces in the list beside the map.' },
};

export const typeLabel = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// Who may enter contests: three versions to compare (Demo bar, Contest details).
export const ELIGIBILITY = {
  // Round 35: every contest is open to any architect on reSpace; the other rules are kept
  // only for reference and no longer selectable.
  both: { text: 'Any architect on reSpace: licensed, licence pending or student', can: () => true },
  licensed: { text: 'Licensed architects only', can: (kind) => kind === 'licensed', no: 'This contest is for licensed architects only.' },
  students: {
    text: 'Architecture students only. It’s a concept contest: the brief pairs the winner with a licensed architect to develop and sign off the design.',
    can: (kind) => kind === 'student',
    no: 'This contest is for architecture students only.',
  },
};

function Stat({ icon, n, label }) {
  return (
    <span className="stat">
      <Icon name={icon} />
      <span><span className="bold">{n}</span> {label}</span>
    </span>
  );
}

// headingLevel keeps the page outline correct (h2 under an h1, h3 under an h2).
// The first real photo of a space, if any (round 22).
export const coverPhoto = (space) => space?.photos?.find((p) => p.src) || null;

export function GatheringBadge({ space }) {
  const { state } = useDemo();
  return gatheringOf(space.id, state.comments).isGathering ? <Badge title="Half or more of the people who shared an experience say it has become a gathering spot">Gathering spot</Badge> : null;
}

export function SpaceCard({ space, faded, active, onHover, headingLevel = 3, variant }) {
  const { spaceCard } = useChoices();
  const { state } = useDemo();
  const nRedesigns = state.redesigns.filter((r) => r.spaceId === space.id && r.published && !r.takenDown && !r.archived).length;
  const v = SPACE_CARD_VARIANTS[variant] ? variant : spaceCard;
  const H = `h${headingLevel}`;
  const votes = <Stat icon="vote" n={space.votes} label={space.votes === 1 ? 'vote' : 'votes'} />;
  const photos = <Stat icon="photo" n={space.photos.length} label={space.photos.length === 1 ? 'photo' : 'photos'} />;
  const redesigns = <Stat icon="redesign" n={nRedesigns} label={nRedesigns === 1 ? 'redesign' : 'redesigns'} />;
  const badges = <><StatusBadges space={space} /><ContestBadge space={space} /><GatheringBadge space={space} /></>;
  const hasBadges = space.status !== 'approved' || space.removal === 'review' || !!activeContest(state, space.id);

  let body;
  if (v === 'footer') {
    body = (
      <>
        <ImageBox label="Photo" src={coverPhoto(space)?.src} alt={coverPhoto(space)?.alt} />
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
        <ImageBox label="Photo" src={coverPhoto(space)?.src} alt={coverPhoto(space)?.alt} />
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
        <div className="card-row-img"><ImageBox label="Photo" shape="square" src={coverPhoto(space)?.src} alt={coverPhoto(space)?.alt} /></div>
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
          <ImageBox label="Photo" src={coverPhoto(space)?.src} alt={coverPhoto(space)?.alt} />
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


// Map placeholder. Pins are plain markers: solid for approved, dashed and hollow for pending.
// `area` sets the extent when nothing is focused, so an empty filter keeps the same map.
// `focus` ({ lat, lng }) zooms in around a point. With `onPinClick`, pins are buttons
// that select a space (map landing); without it they link to the space page (Browse).
// `me` draws a "you are here" marker.
// `areaM` draws the area being defined around `me` (metres from the centre); `onMapClick` gets { lat, lng }.
// The map itself lives in RealMap.jsx (Leaflet); re-exported here so imports stay the same.
import { MapBox } from './RealMap.jsx';

export { MapBox };

// A person's name that opens their public page: an architect's portfolio, or a
// member's profile. Organisations without a page show as plain text.
export const profilePath = (u) => (!u ? null : u.role === 'architect' ? `/architect/${u.id}` : `/member/${u.id}`);
export function UserLink({ id, you, className = '' }) {
  const { get, user } = useDemo();
  const u = get.user(id);
  if (!u) return <span className={className}>Former member</span>;
  const me = you !== false && user?.id === u.id;
  return <Link to={profilePath(u)} className={`user-link ${className}`}>{u.name}{me ? ' (you)' : ''}</Link>;
}

// Pick one space from many: search by name, area or type, with a small map of the
// matches. Used where a dropdown would be too long (Host a contest).
export function SpacePicker({ spaces, value, onChange, label = 'Which space?', all }) {
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const matches = term ? spaces.filter((s) => `${s.name} ${s.type} ${s.city || ''}`.toLowerCase().includes(term)) : spaces;
  const shown = [...matches].sort((a, b) => b.votes - a.votes).slice(0, 6);
  const picked = spaces.find((s) => s.id === value);
  return (
    <div className="field space-picker">
      <label className="label" htmlFor="space-pick-q">{label}</label>
      {picked && (
        <p className="space-picked small" role="status">
          Selected: <span className="bold">{picked.name}</span> ({picked.votes} votes)
        </p>
      )}
      <input id="space-pick-q" className="input" type="search" placeholder="Search by name, area or type" value={q} onChange={(e) => setQ(e.target.value)} aria-controls="space-pick-list" />
      <div className="space-picker-body">
        <ul id="space-pick-list" className="space-pick-list" aria-label="Matching spaces">
          {shown.map((s) => (
            <li key={s.id}>
              <button type="button" className="space-pick" aria-pressed={value === s.id} onClick={() => onChange(s.id)}>
                <span className="bold small">{s.name}</span>
                <span className="xs muted">{s.type}, {s.votes} votes</span>
              </button>
            </li>
          ))}
          {matches.length > shown.length && <li className="xs muted">{matches.length - shown.length} more. Keep typing to narrow it down.</li>}
          {matches.length === 0 && <li className="small muted">No approved spaces match “{q.trim()}”.</li>}
        </ul>
        <MapBox spaces={shown} area={all || spaces} selectedId={value} onPinClick={(s) => onChange(s.id)} className="map-small" label="" />
      </div>
    </div>
  );
}

// "26.9239, 75.8267" → { lat, lng }; anything else → null.
export function parseLatLng(q) {
  const m = q.trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const [lat, lng] = [Number(m[1]), Number(m[2])];
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
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

// Two rounds: an open concept round, then a paid shortlist that develops full proposals.
// Round 33: a space with a contest under way says so on its cards and page header.
export const activeContest = (state, spaceId) => state.contests.find((c) => c.spaceId === spaceId && c.status !== 'closed');
export function ContestBadge({ space }) {
  const { state } = useDemo();
  const c = activeContest(state, space.id);
  if (!c) return null;
  return <Badge kind="accent">{c.status === 'live' && c.phase === 1 ? 'Contest open' : 'Contest under way'}</Badge>;
}

export const contestStatus = (c) => {
  if (c.status === 'closed') return 'Closed';
  if (c.status === 'judging') return c.phase === 2 ? 'Final judging' : 'Shortlisting';
  return c.phase === 2 ? 'Round 2: shortlist at work' : 'Round 1: open for concepts';
};
const fmtD = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');

// The four moments of a contest, with the two deadlines. `at` marks where it is now.
export function ContestRounds({ contest: c }) {
  const step = c.status === 'closed' ? 4 : c.phase === 2 ? (c.status === 'judging' ? 3 : 2) : c.status === 'judging' ? 1 : 0;
  const items = [
    ['Round 1: concepts due', fmtD(c.deadline), `Open to every eligible architect. A light submission: one concept sheet and a short statement.`],
    ['Shortlist announced', '', `The co-host picks ${c.shortlistSize} ${c.shortlistSize === 1 ? 'entry' : 'entries'}. Each shortlisted architect is paid ${c.shortlistPay} to develop the idea.`],
    ['Round 2: full proposals due', fmtD(c.deadline2), 'Shortlisted architects develop their concept into drawings the co-host can build from.'],
    ['Winner announced', '', `The winner receives the ${c.prize} prize and sells the design to the co-host. Everyone else keeps their rights and can publish in the Redesign Library.`],
  ];
  return (
    <ol className="rounds">
      {items.map(([t, d, note], i) => (
        <li key={t} className={i < step ? 'is-done' : i === step ? 'is-now' : ''} aria-current={i === step ? 'step' : undefined}>
          <span className="rounds-dot" aria-hidden="true" />
          <div className="stack-sm">
            <span className="bold small">{t}{d && <span className="rounds-date">{d}</span>}</span>
            <span className="xs muted">{note}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

// Who is paid what. Shortlisted entries are paid, not just the winner.
export function ContestMoney({ contest: c }) {
  return (
    <dl className="dl contest-money">
      <dt>Prize to the winner</dt><dd className="bold">{c.prize}</dd>
      <dt>Shortlist</dt><dd><span className="bold">{c.shortlistPay} each</span> to {c.shortlistSize} shortlisted architects to develop their idea</dd>
      <dt>Total funded</dt><dd>{c.budget}, held in escrow by the co-host</dd>
      <dt>To enter</dt><dd>Free for paid members; {c.entryFee} entry fee for everyone else</dd>
    </dl>
  );
}

// The winning entry of a closed contest, or null.
export const contestWinner = (c) => (c.status === 'closed' ? c.entries.find((e) => e.id === c.winner) || null : null);

// What happens after a contest: a short timeline from the co-host's plans.
export function ContestPlans({ contest, compact }) {
  const plans = contest.plans || [];
  if (!plans.length) return null;
  const shown = compact ? plans.filter((p) => !p.done).slice(0, 1) : plans;
  if (!shown.length) return null;
  return (
    <ol className={`plans ${compact ? 'plans-compact' : ''}`}>
      {shown.map((p) => (
        <li key={p.when + p.text} className={p.done ? 'plan-done' : ''}>
          <span className="plan-when">{p.when}</span>
          <span>{p.text}{p.done ? '' : ''}</span>
          <span className="visually-hidden">{p.done ? ' (done)' : ' (planned)'}</span>
        </li>
      ))}
    </ol>
  );
}

export function ContestCard({ contest }) {
  const { get } = useDemo();
  const sp = get.space(contest.spaceId);
  const won = contestWinner(contest);
  return (
    <Link to={`/contest/${contest.id}`} className="card card-link">
      <div className="row"><Badge kind={contest.status === 'live' ? 'solid' : ''}>{contestStatus(contest)}</Badge></div>
      <h3>{contest.title}</h3>
      <p><span className="display-sm">{contest.prize}</span> <span className="small muted">prize, and {contest.shortlistPay} to each of {contest.shortlistSize} shortlisted</span></p>
      <p className="xs muted">{contest.status === 'live' && contest.phase === 1 ? `Concepts due ${fmtD(contest.deadline)}` : contest.status === 'closed' ? 'Closed' : `Proposals due ${fmtD(contest.deadline2)}`}</p>
      <p className="small muted">Site: {sp?.name}</p>
      {won ? (
        <div className="stack-sm">
          <p className="small"><span className="bold">Winner:</span> {won.title} by {get.user(won.architectId)?.name}</p>
          {contest.plans?.some((p) => !p.done) && <p className="small muted">Next: {contest.plans.find((p) => !p.done).text} ({contest.plans.find((p) => !p.done).when})</p>}
        </div>
      ) : (
        <dl className="dl">
          <dt>{contest.status === 'live' ? 'Entries close' : 'Entries closed'}</dt><dd>{contest.deadline}</dd>
          <dt>Co-host</dt><dd>{contest.coHost}</dd>
          <dt>Entries</dt><dd>{contest.entries.length}</dd>
        </dl>
      )}
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

// ── Read-only area map: a space's drawn area and any spaces that overlap it ──
// Centre is the space; other spaces are placed by their real offset in metres.
export function AreaMap({ space, others = [], label = 'Map placeholder' }) {
  const shape = shapeOf(space);
  const items = [{ s: space, shape, p: { x: 0, y: 0 }, main: true }, ...others.map((s) => ({ s, shape: shapeOf(s), p: toXY(space, s) }))];
  // Fit everything: the furthest edge from the centre, with a margin.
  const reach = Math.max(...items.map(({ p, shape: sh }) => Math.hypot(p.x, p.y) + radiusOf(sh)));
  const spanX = Math.max(40, reach * 2.4);
  const spanY = spanX * (9 / 16);
  const pct = (q) => ({ left: 50 + (q.x / spanX) * 100, top: 50 - (q.y / spanY) * 100 });
  return (
    <figure className="captioned">
      <div className="map area-map area-map-static" role="img" aria-label={`Map of ${space.name}${others.length ? ` and ${others.length} overlapping space${others.length === 1 ? '' : 's'}` : ''}`}>
        <span className="map-label">{label}</span>
        <svg className="area-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {items.map(({ s, shape: sh, p, main }) => {
            const c = pct(p);
            return sh.mode === 'circle'
              ? <ellipse key={s.id} className={main ? 'area-main' : 'area-other'} cx={c.left} cy={c.top} rx={(sh.r / spanX) * 100} ry={(sh.r / spanY) * 100} vectorEffect="non-scaling-stroke" />
              : <polygon key={s.id} className={main ? 'area-main' : 'area-other'} points={sh.pts.map((q) => pct({ x: p.x + q.x, y: p.y + q.y })).map((q) => `${q.left},${q.top}`).join(' ')} vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
        {items.map(({ s, p, main }) => {
          const c = pct(p);
          return (
            <span key={s.id} className={main ? 'pin-me' : `pin pin-static ${s.status === 'approved' ? 'pin-approved' : 'pin-pending'}`} style={{ left: `${c.left}%`, top: `${c.top}%` }} aria-hidden="true">
              {!main && <span className="area-pin-label">{s.name.split(',')[0]}</span>}
            </span>
          );
        })}
      </div>
      <figcaption>Solid outline: this space’s drawn area, about {Math.round(areaM2(shape))} m². Dashed: overlapping spaces. Map about {Math.round(spanX)} m across.</figcaption>
    </figure>
  );
}

// ── Collaborators: find people on the platform, or invite someone by email ──
// value: [{ id } | { email }]
export function Collaborators({ value, onChange }) {
  const { state, user, get } = useDemo();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const people = state.users.filter((u) => u.id !== user.id && !value.some((c) => c.id === u.id));
  const term = q.trim().toLowerCase();
  const matches = term ? people.filter((u) => u.name.toLowerCase().includes(term)) : people.slice(0, 6);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.trim());
  const add = (c) => { onChange([...value, c]); setQ(''); };
  const label = (c) => (c.id ? get.user(c.id)?.name : c.email);
  return (
    <div className="field">
      <span className="label">Collaborators<Opt /></span>
      <span className="xs muted">They’re credited with you and notified. People not on the platform get an email invitation.</span>
      {value.length > 0 && (
        <ul className="collab-list" aria-label="Collaborators">
          {value.map((c) => (
            <li key={c.id || c.email} className="collab">
              <span>{label(c)}{c.email && <span className="muted"> (invited)</span>}</span>
              <button type="button" className="link-btn xs" onClick={() => onChange(value.filter((x) => x !== c))} aria-label={`Remove ${label(c)}`}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      <div><Button onClick={() => setOpen(true)}>Add collaborator</Button></div>
      {open && (
        <Modal title="Invite collaborators" onClose={() => setOpen(false)}>
          <div className="field">
            <label className="label" htmlFor="collab-q">Find people by name, or enter an email</label>
            <input id="collab-q" className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" placeholder="e.g. Architect B, or name@studio.com" />
          </div>
          <ul className="list small" aria-live="polite">
            {matches.map((u) => (
              <li key={u.id} className="row between">
                <span><span className="bold">{u.name}</span> <span className="muted">{u.role === 'architect' ? (u.licence || 'Architect') : 'Member'}</span></span>
                <Button onClick={() => add({ id: u.id })}>Add<span className="visually-hidden"> {u.name}</span></Button>
              </li>
            ))}
            {term && matches.length === 0 && !isEmail && <li className="muted">No one called “{q.trim()}”. Enter their email to invite them.</li>}
            {isEmail && (
              <li className="row between">
                <span>Invite <span className="bold">{q.trim()}</span> by email</span>
                <Button onClick={() => add({ email: q.trim() })}>Invite</Button>
              </li>
            )}
          </ul>
          {value.length > 0 && <p className="small">Added: {value.map(label).join(', ')}</p>}
          <FormActions><Button variant="primary" onClick={() => setOpen(false)}>Done</Button></FormActions>
        </Modal>
      )}
    </div>
  );
}

// A person's public contributions: shared by member profiles and the architect page's Contributions tab.
export function contributionCounts(state, userId) {
  return {
    documented: state.spaces.filter((s) => s.uploadedBy === userId && !s.removed),
    experiences: state.comments.filter((c) => c.userId === userId && !c.archived),
    photos: state.spaces.reduce((n, s) => n + s.photos.filter((p) => p.credit === userId).length, 0),
  };
}

export function Contributions({ userId, headingLevel = 2 }) {
  const { state, get } = useDemo();
  const { documented, experiences, photos } = contributionCounts(state, userId);
  const H = `h${headingLevel}`;
  return (
    <div className="stack">
      <dl className="dl">
        <dt>Spaces documented</dt><dd>{documented.length}</dd>
        <dt>Experiences shared</dt><dd>{experiences.length}</dd>
        <dt>Photos</dt><dd>{photos}</dd>
      </dl>
      <section className="stack-sm" aria-labelledby={`contrib-spaces-${userId}`}>
        <H id={`contrib-spaces-${userId}`} className="h-sm">Spaces documented</H>
        {documented.length ? (
          <div className="related-list">{documented.map((s) => <SpaceCard key={s.id} space={s} variant="row" headingLevel={headingLevel + 1} />)}</div>
        ) : <p className="small muted">None yet.</p>}
      </section>
      <section className="stack-sm" aria-labelledby={`contrib-exp-${userId}`}>
        <H id={`contrib-exp-${userId}`} className="h-sm">Experiences</H>
        {experiences.length ? (
          <ul className="stack-sm plain-list">
            {experiences.map((c) => <li key={c.id} className="small"><Link to={`/space/${c.spaceId}?tab=experience`}>{get.space(c.spaceId)?.name}</Link>: “{c.text}”</li>)}
          </ul>
        ) : <p className="small muted">None yet.</p>}
      </section>
    </div>
  );
}
