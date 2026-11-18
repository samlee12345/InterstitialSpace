import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Button, Choice, FormActions, Icon, ImageBox, Input, Page, Select } from '../components/ui.jsx';
import { MapBox, SpaceCard, distanceM, matchesSearch, parseLatLng } from '../components/domain.jsx';
import { useChoices } from '../design/choices.js';

const VISITOR_LIMIT = 10;

// What the section under the hero says. Compare in the sandbox; the chosen one is in design/choices.js.
// Every claim here comes from the dev spec; nothing new is promised.
function HowItWorks() {
  const steps = [
    ['Document a space', 'Anyone with an account photographs a stoop, step or courtyard and says how it feels and what should change. Documentation is free and open.'],
    ['Vote for what needs fixing', 'Votes, worth more when cast on site, show architects, local authorities and contest co-hosts which spaces people care about most.'],
    ['Architects redesign it', 'Architects propose redesigns for documented spaces and sell them. They keep 80% of each sale and their copyright.'],
    ['Co-hosts fund the change', 'A local authority, NGO, owner or residents’ group funds a contest prize, judges the entries and buys the winning design.'],
  ];
  return (
    <section className="stack" aria-labelledby="how-heading">
      <h2 id="how-heading">How a space gets better</h2>
      <ol className="steps-row">
        {steps.map(([title, text]) => (
          <li key={title}>
            <h3>{title}</h3>
            <p className="small">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ForWhom() {
  const groups = [
    ['If you live or work near a space', 'Document the places you use every day, say what should change and vote. Your votes point architects and local authorities at what needs fixing.', ['/space/new', 'Document a space']],
    ['If you are an architect', 'Sell redesigns of real, documented spaces at a set price, keep 80% and your copyright, build a public portfolio and enter funded contests.', ['/contests', 'See open contests']],
    ['If you fund or run public space', 'See which spaces residents care about most, buy measured models, and co-host a contest to get a design for a specific site.', ['/browse', 'Browse by votes']],
  ];
  return (
    <section className="stack" aria-labelledby="who-heading">
      <h2 id="who-heading">Who it’s for</h2>
      <div className="audiences">
        {groups.map(([title, text, [to, label]]) => (
          <div key={title} className="stack-sm">
            <h3>{title}</h3>
            <p className="small">{text}</p>
            <Link to={to} className="small">{label}</Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function SpotlightFirst() {
  return (
    <section className="spotlight" aria-labelledby="spot-heading">
      <div className="stack">
        <h2 id="spot-heading">Show the city what needs fixing</h2>
        <p className="prose">
          A step that floods every monsoon, a courtyard with no shade, a gate where people wait with nowhere to sit. Document it, and ask your neighbours to vote. The spaces with the most votes are the ones architects redesign and co-hosts fund.
        </p>
        <div><Button to="/browse">See the most-voted spaces</Button></div>
      </div>
      <ul className="spot-list small">
        <li><span className="bold">Residents</span> document and vote, for free.</li>
        <li><span className="bold">Architects</span> sell redesigns and keep 80%.</li>
        <li><span className="bold">Local authorities and NGOs</span> fund contests for the spaces that matter.</li>
      </ul>
    </section>
  );
}

function CoopBand() {
  return (
    <section className="coop-band" aria-labelledby="coop-heading">
      <h2 id="coop-heading">Owned by the people who use it</h2>
      <p className="small">Every account is a member of the co-op with one vote on how it runs. Any surplus at the end of the year goes back to members by the points they earned. If the platform ever closes, contributors keep their work.</p>
      <div className="row small"><Link to="/co-op">How the co-op decides</Link><Link to="/terms">Terms of Use</Link></div>
    </section>
  );
}

export const LANDING_VARIANTS = {
  steps: { name: 'How it works', note: 'Four steps in order, from documenting to funding. Explains the whole model to every visitor at once.', render: () => <><HowItWorks /><CoopBand /></> },
  audiences: { name: 'Who it’s for', note: 'One block per audience with its own next step. Best if visitors arrive already knowing which group they are in.', render: () => <><ForWhom /><CoopBand /></> },
  spotlight: { name: 'Call out what needs fixing', note: 'Leads with the civic case: residents pointing at spaces that need work. Strongest story for community members.', render: () => <><SpotlightFirst /><CoopBand /></> },
};

function RecentlyDocumented() {
  const { visibleSpaces } = useDemo();
  return (
    <section className="stack" aria-labelledby="recent-heading">
      <div className="row between">
        <h2 id="recent-heading">Recently documented</h2>
        <Link to="/browse">See all spaces</Link>
      </div>
      <div className="grid">{visibleSpaces.slice(0, 4).map((s) => <SpaceCard key={s.id} space={s} />)}</div>
    </section>
  );
}

function ClassicLanding() {
  const { isMember } = useDemo();
  const { landing } = useChoices();
  return (
    <Page>
      <section className="split">
        <div className="stack">
          <h1 className="display">The stoop, the stepwell, the courtyard in between.</h1>
          <p className="lede">People document the everyday spaces they live with. Architects propose how to improve them. The platform is a co-op owned by everyone who uses it.</p>
          <div className="row">
            <Button variant="primary" to="/browse">Browse spaces in Jaipur</Button>
            {!isMember && <Button to="/signup">Sign up</Button>}
          </div>
        </div>
        <ImageBox label="Photo: steps at Jaipur Darwaza (placeholder)" />
      </section>
      {(LANDING_VARIANTS[landing] || LANDING_VARIANTS.steps).render()}
      <RecentlyDocumented />
    </Page>
  );
}

// Simulated positions for "Use my location". The Demo bar chooses which one you get.
export const LOCATE = {
  new: { lat: 26.9301, lng: 75.8243, label: 'a place that isn’t documented yet' },
  existing: { lat: 26.93615, lng: 75.81535, spaceId: 's5', label: 'a documented space' },
};
const NEARBY_M = 50;

function redesignCount(state, id) {
  return state.redesigns.filter((r) => r.spaceId === id && r.published && !r.takenDown).length;
}

// The selected space in the side panel, plus the other spaces within 50 m.
function SelectedSpace({ space, onBack, onSelect }) {
  const { visibleSpaces } = useDemo();
  const nearby = visibleSpaces
    .filter((s) => s.id !== space.id)
    .map((s) => ({ s, d: distanceM(space, s) }))
    .filter((x) => x.d <= NEARBY_M)
    .sort((a, b) => a.d - b.d);
  return (
    <div className="stack">
      <div><button type="button" className="link-btn small" onClick={onBack}>Back to search</button></div>
      <SpaceCard space={space} variant="row" headingLevel={2} />
      <section className="stack-sm" aria-labelledby="nearby-h">
        <h3 id="nearby-h" className="demo-h">Other spaces within {NEARBY_M} m</h3>
        {nearby.length === 0 ? (
          <p className="small muted">No other documented spaces within {NEARBY_M} m.</p>
        ) : (
          <ul className="list small">
            {nearby.map(({ s, d }) => (
              <li key={s.id}>
                <button type="button" className="result-btn" onClick={() => onSelect(s)}>
                  <span className="bold">{s.name}</span>
                  <span className="muted">{Math.round(d)} m away, {s.votes} votes</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// Map-first landing (like OpenCelliD): the map is the page, with search and a short
// description on top. Clicking a pin zooms in and shows that space in the panel;
// the card opens the space. Searching for a place that isn't there offers to add it.
function MapLanding() {
  const { state, visibleSpaces, isMember, dispatch, get } = useDemo();
  const { landing } = useChoices();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [hover, setHover] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [locate, setLocate] = useState('idle'); // idle | locating | new
  const [me, setMe] = useState(null);
  const panel = useRef(null);
  const selected = selectedId ? get.space(selectedId) : null;
  const results = q.trim() ? visibleSpaces.filter((s) => matchesSearch(s, q)) : [];
  const pins = q.trim() && !selected ? results : visibleSpaces;
  const focus = selected ? { lat: selected.lat, lng: selected.lng } : locate === 'new' ? me : null;

  const select = (s) => { setSelectedId(s.id); setLocate('idle'); setTimeout(() => panel.current?.querySelector('a, button')?.focus(), 0); };
  const back = () => { setSelectedId(null); setLocate('idle'); setMe(null); };
  const addPlace = (name) => {
    const to = `/space/new${name ? `?name=${encodeURIComponent(name)}` : ''}`;
    if (isMember) nav(to);
    else dispatch({ type: 'OPEN_SIGNUP', reason: 'upload', returnTo: to });
  };
  const locateMe = () => {
    setSelectedId(null);
    setLocate('locating');
    setTimeout(() => {
      const found = LOCATE[state.locateFinds] || LOCATE.new;
      setMe({ lat: found.lat, lng: found.lng });
      if (found.spaceId) { setLocate('idle'); setSelectedId(found.spaceId); } else setLocate('new');
    }, 900);
  };

  let content;
  if (selected) {
    content = (
      <>
        {me && <p className="note small">You’re here: this space is {Math.round(distanceM(me, selected))} m from your location.</p>}
        <SelectedSpace space={selected} onBack={back} onSelect={select} />
      </>
    );
  } else if (locate === 'locating') {
    content = <div className="row" role="status"><div className="spinner" aria-hidden="true" /><span>Finding your location…</span></div>;
  } else if (locate === 'new') {
    content = (
      <div className="stack">
        <div><button type="button" className="link-btn small" onClick={back}>Back to search</button></div>
        <h2 className="h-sm">Nothing documented here yet</h2>
        <p className="small">You’re at {me.lat.toFixed(4)}, {me.lng.toFixed(4)}. No space on the platform is within {NEARBY_M} m. If you’re standing somewhere worth documenting, add it: photos taken here count in full.</p>
        <div><Button variant="primary" onClick={() => addPlace('')}>{isMember ? 'Document this place' : 'Sign up to document this place'}</Button></div>
      </div>
    );
  } else {
    content = (
      <>
        <h1>The stoop, the stepwell, the courtyard in between.</h1>
        <p className="small">A map of everyday in-between spaces in Jaipur, documented by the people who use them. Architects propose redesigns, and the platform is a co-op owned by its members.</p>
        <form onSubmit={(e) => { e.preventDefault(); if (results.length === 1) select(results[0]); }}>
          <label htmlFor="map-q" className="small bold">Search for a space</label>
          <input id="map-q" className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Stepwell, Johari Bazaar, shade…" autoComplete="off" />
        </form>
        <div><Button onClick={locateMe}><Icon name="locate" />Use my location</Button></div>
        {q.trim() && (
          <div className="map-results" aria-live="polite">
            {results.length > 0 ? (
              <>
                <p className="xs muted">{results.length} {results.length === 1 ? 'space' : 'spaces'} on the map</p>
                <ul className="list small">
                  {results.slice(0, 5).map((s) => {
                    const n = redesignCount(state, s.id);
                    return (
                      <li key={s.id} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}>
                        <button type="button" className="result-btn" onClick={() => select(s)}>
                          <span className="bold">{s.name}</span>
                          <span className="row muted">
                            <span className="stat"><Icon name="vote" />{s.votes} votes</span>
                            <span className="stat"><Icon name="redesign" />{n} {n === 1 ? 'redesign' : 'redesigns'}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {results.length > 5 && <Link className="small" to="/browse">See all {results.length} in Browse</Link>}
              </>
            ) : (
              <div className="stack-sm">
                <p className="small">No space called “{q.trim()}” yet.</p>
                <div><Button variant="primary" onClick={() => addPlace(q.trim())}>{isMember ? 'Add this place' : 'Sign up to add this place'}</Button></div>
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <main id="main" tabIndex={-1} data-screen-label="page" className="map-landing">
      <MapBox
        spaces={pins}
        area={visibleSpaces}
        activeId={hover}
        selectedId={selectedId}
        onHover={setHover}
        onPinClick={select}
        focus={focus}
        me={me}
        className="map-hero"
        label={null}
      >
        <div className="map-search" role="region" aria-label="Search and details" ref={panel}>{content}</div>
        {focus && <button type="button" className="btn map-zoom-out" onClick={back}>Show all of Jaipur</button>}
        <span className="map-label map-label-br">Map placeholder: Jaipur. Dashed pins are pending.</span>
      </MapBox>
      <div className="page stack-lg">
        {(LANDING_VARIANTS[landing] || LANDING_VARIANTS.steps).render()}
        <RecentlyDocumented />
      </div>
    </main>
  );
}

export function Landing() {
  const { landingLayout } = useChoices();
  return landingLayout === 'map' ? <MapLanding /> : <ClassicLanding />;
}

const SORTS = {
  votes: { label: 'Most votes', fn: (a, b) => b.votes - a.votes },
  photos: { label: 'Most photos', fn: (a, b) => b.photos.length - a.photos.length },
  name: { label: 'Name (A to Z)', fn: (a, b) => a.name.localeCompare(b.name) },
};

const NEAR_POINT_M = 500; // radius for a "lat, lon" search on Browse

const STATUSES = {
  all: { label: 'All', test: () => true },
  approved: { label: 'Approved', test: (s) => s.status === 'approved' },
  pending: { label: 'Pending', test: (s) => s.status === 'pending' },
};

export function Browse() {
  const { visibleSpaces, isMember, state, need } = useDemo();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('votes');
  const [hover, setHover] = useState(null);
  const limited = !isMember && state.signupDismissed;
  // A "lat, lon" search finds spaces near that point, nearest first; anything else matches text.
  const point = parseLatLng(q);
  const near = (s) => distanceM(point, s) <= NEAR_POINT_M;
  const list = visibleSpaces
    .filter((s) => STATUSES[status].test(s) && (type === 'all' || s.type === type) && (point ? near(s) : matchesSearch(s, q)))
    .sort(point ? (a, b) => distanceM(point, a) - distanceM(point, b) : SORTS[sort].fn);
  const hidden = limited ? list.slice(VISITOR_LIMIT).map((s) => s.id) : [];
  const types = ['all', ...new Set(visibleSpaces.map((s) => s.type))];
  return (
    <Page tag="simulated" wide>
      <div className="browse">
        <div className="stack">
          <div className="row between">
            <h1>Browse spaces</h1>
            <Button variant="primary" to="/space/new" onClick={(e) => !need('upload') && e.preventDefault()}>Create new interstitial space</Button>
          </div>
          <div className="field">
            <label htmlFor="browse-q">Search</label>
            <input id="browse-q" className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Enter address or lat, lon" autoComplete="off" aria-describedby="browse-q-hint" />
            <span id="browse-q-hint" className="xs muted">For example Johari Bazaar, or 26.9239, 75.8267</span>
          </div>
          <div className="row row-end">
            <fieldset className="segmented">
              <legend>Status</legend>
              <div className="segmented-track">
                {Object.entries(STATUSES).map(([id, o]) => (
                  <label key={id} className="segment">
                    <input type="radio" name="status" value={id} checked={status === id} onChange={() => setStatus(id)} />
                    <span>{o.label} <span className="muted">{visibleSpaces.filter(o.test).length}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Select label="Type" value={type} onChange={(e) => setType(e.target.value)} options={types.map((t) => ({ value: t, label: t === 'all' ? 'All types' : t }))} />
            <Select label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)} options={Object.entries(SORTS).map(([value, o]) => ({ value, label: o.label }))} />
          </div>
          {limited && (
            <p className="note">You’re browsing without an account, so {VISITOR_LIMIT} spaces are shown and the rest are blurred. <Link to="/signup">Sign up to see all {visibleSpaces.length}</Link></p>
          )}
          <p className="small muted" aria-live="polite">
            {list.length} {list.length === 1 ? 'space' : 'spaces'}
            {point && ` within ${NEAR_POINT_M} m of ${point.lat}, ${point.lng}, nearest first`}
          </p>
          {list.length === 0 ? (
            <div className="note stack-sm">
              <span>No spaces match{q.trim() ? ` “${q.trim()}”` : ''}.</span>
              <div className="row">
                <button type="button" className="link-btn" onClick={() => { setQ(''); setStatus('all'); setType('all'); }}>Clear search and filters</button>
                {q.trim() && <Link to={`/space/new?name=${encodeURIComponent(q.trim())}`} onClick={(e) => !need('upload') && e.preventDefault()}>Add “{q.trim()}” as a new space</Link>}
              </div>
            </div>
          ) : (
            <div className="grid grid-tight">
              {list.map((s) => (
                <SpaceCard key={s.id} space={s} headingLevel={2} faded={hidden.includes(s.id)} active={hover === s.id} onHover={setHover} />
              ))}
            </div>
          )}
        </div>
        <MapBox spaces={list} area={visibleSpaces} hiddenIds={hidden} activeId={hover} onHover={setHover} me={point} sticky />
      </div>
    </Page>
  );
}

// Free community account. Architects go through verification at /architects.
export function Signup() {
  const { dispatch, isMember, state } = useDemo();
  const nav = useNavigate();
  const back = state.returnTo || '/browse';
  const [f, setF] = useState({ name: '', email: '' });
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim() || !f.email.includes('@')) return setErr('Enter your name and an email address.');
    setErr('');
    dispatch({ type: 'SIGNUP', kind: 'community' });
    dispatch({ type: 'CLEAR_RETURN' });
    return nav(back);
  };
  return (
    <Page narrow>
      <h1>Create a free account</h1>
      {isMember && <p className="note">You’re already signed in for this demo role. Switch to Visitor in the Demo bar to try sign-up from scratch.</p>}
      <p>Document spaces, add your experience, vote, and buy redesigns and models. Every account is a member of the co-op with one vote.</p>
      <form className="stack" onSubmit={submit}>
        <Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
        <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" />
        <Input label="Password" type="password" autoComplete="new-password" />
        {err && <span className="error" role="alert">{err}</span>}
        <FormActions><Button variant="primary" type="submit">Create account</Button></FormActions>
      </form>
      <p className="small muted">Are you an architect? <Link to="/architects">Get verified as an architect</Link> to sell redesigns. Already have an account? <Link to="/login">Log in</Link>. <Link to="/terms">Terms of Use</Link></p>
    </Page>
  );
}

export function Terms() {
  const rows = [
    ['Documentation of spaces', 'Photos, scans and questionnaire answers are shared under a Creative Commons licence and stay open. You keep ownership of what you upload.'],
    ['Redesigns and measured models', 'Sold under the platform purchase licence. Buyers can use and adapt the files. They cannot redistribute them.'],
    ['Architects', 'Keep copyright in their redesigns and receive 80% of each sale; the platform keeps 20%. They can publish one redesign per space each week. An agency can buy full design rights: the price and terms are agreed between the agency and the architect, and the architect must be credited.'],
    ['Spatial diagrams', 'The platform keeps the download fee for Base Library diagrams and models. Community photographers are credited.'],
    ['Contests', 'The co-host funds the prize, sets the criteria and judges. The winning architect receives the full prize and sells the design to the co-host.'],
    ['Private owners', 'Anyone can document a space visible from public ground. An owner can request removal with proof of ownership; the team reviews each request.'],
    ['The co-op', 'Every account holder is a member with one vote. Any year-end surplus is returned to members by points.'],
    ['If the platform shuts down', 'Contributors keep their work.'],
  ];
  return (
    <Page narrow tag="simulated">
      <h1>Terms of Use</h1>
      <p className="muted">A plain summary for the class demo, not legal text.</p>
      <dl className="stack">
        {rows.map(([t, d]) => (
          <div key={t} className="card"><dt className="bold">{t}</dt><dd>{d}</dd></div>
        ))}
      </dl>
    </Page>
  );
}

// Footer pages: short placeholders for the class demo.
export function About() {
  return (
    <Page narrow tag="simulated">
      <h1>About us</h1>
      <p className="prose">Interstitial Spaces documents the in-between places of a city: steps, thresholds, courtyards and edges that people use but nobody designed for. Residents record how they feel; architects propose redesigns; civic bodies and co-hosts fund the ones people vote for.</p>
      <p className="prose">The platform is a co-operative. Every account holder is a member with one vote, and any year-end surplus is returned to members by points.</p>
      <p className="small muted">A class project for New Economies and Societies at Parsons. All content is placeholder.</p>
    </Page>
  );
}

export function Contact() {
  return (
    <Page narrow tag="simulated">
      <h1>Contact us</h1>
      <dl className="dl dl-wide">
        <dt>General questions</dt><dd>hello@interstitial.example</dd>
        <dt>Removal requests</dt><dd>Open the space and choose “Request removal”, or write to removals@interstitial.example with proof of ownership.</dd>
        <dt>Contests and partnerships</dt><dd>partners@interstitial.example, or <Link to="/contest/request">host a contest</Link>.</dd>
        <dt>Press</dt><dd>press@interstitial.example</dd>
      </dl>
      <p className="small muted">Placeholder addresses for the class demo.</p>
    </Page>
  );
}

export function Privacy() {
  return (
    <Page narrow tag="simulated">
      <h1>Privacy policy</h1>
      <p className="muted">A plain summary for the class demo, not legal text.</p>
      <dl className="dl dl-wide">
        <dt>What we keep</dt><dd>Your name, email, the work you upload, and for architects the register or school details used to verify you.</dd>
        <dt>Photo locations</dt><dd>Used to place spaces on the map. The exact point is shown only for the space, not linked to where you live.</dd>
        <dt>Identity documents</dt><dd>Checked against the register, then deleted. We keep only the result.</dd>
        <dt>Deleting your account</dt><dd>Removes your profile. Documentation you shared stays under its Creative Commons licence, credited as “Former member”.</dd>
      </dl>
    </Page>
  );
}
