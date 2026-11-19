import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Button, Choice, DemoOnly, Empty, FormActions, Icon, ImageBox, Input, Modal, Page, Select } from '../components/ui.jsx';
import { MapBox, SpaceCard, distanceM, matchesSearch, parseLatLng, typeLabel } from '../components/domain.jsx';
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
  return state.redesigns.filter((r) => r.spaceId === id && r.published && !r.takenDown && !r.archived).length;
}

// The selected space, shown in the search panel under the search box, with its
// connected spaces: the space it sits inside and the spaces inside it.
function SelectedSpace({ space, onClose, onSelect }) {
  const { state, get } = useDemo();
  const parent = space.parentId ? get.space(space.parentId) : null;
  const children = state.spaces.filter((s) => s.parentId === space.id && !s.removed && !s.private);
  const connected = [...(parent && !parent.removed ? [{ s: parent, rel: 'Contains this space' }] : []), ...children.map((s) => ({ s, rel: 'Inside this space' }))];
  return (
    <div className="stack-sm selected-space">
      <div className="row between">
        <span className="xs muted">Selected on the map</span>
        <button type="button" className="link-btn small" onClick={onClose}>Clear<span className="visually-hidden"> selection</span></button>
      </div>
      <SpaceCard space={space} variant="row" headingLevel={2} />
      <section className="stack-sm" aria-labelledby="connected-h">
        <h3 id="connected-h" className="demo-h">Connected spaces ({connected.length})</h3>
        {connected.length === 0 ? (
          <p className="small muted">Not part of another space, and no spaces inside it.</p>
        ) : (
          <ul className="list small">
            {connected.map(({ s, rel }) => (
              <li key={s.id}>
                <button type="button" className="result-btn" onClick={() => onSelect(s)}>
                  <span className="bold">{s.name}</span>
                  <span className="muted">{rel}, {s.votes} votes</span>
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
  // "lat, lon" finds spaces near that point, nearest first; anything else matches names and places.
  const point = parseLatLng(q);
  const results = !q.trim() ? [] : point
    ? visibleSpaces.filter((s) => distanceM(point, s) <= 500).sort((a, b) => distanceM(point, a) - distanceM(point, b))
    : visibleSpaces.filter((s) => matchesSearch(s, q));
  const pins = q.trim() && !selected ? results : visibleSpaces;
  const focus = selected ? { lat: selected.lat, lng: selected.lng } : locate === 'new' ? me : point && q.trim() ? point : null;

  const select = (s) => { setSelectedId(s.id); setLocate('idle'); setTimeout(() => panel.current?.querySelector('.selected-space a')?.focus(), 0); };
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

  // The intro and search always stay in the panel; results, the selected space
  // or the location result appear under them.
  let below = null;
  if (selected) {
    below = (
      <>
        {me && (
          <div className="note small stack-sm">
            <span>You’re here: this space is {Math.round(distanceM(me, selected))} m from your location.</span>
            <span>Somewhere else here worth documenting? <button type="button" className="link-btn" onClick={() => addPlace('')}>Document a new space here</button></span>
          </div>
        )}
        <SelectedSpace space={selected} onClose={back} onSelect={select} />
      </>
    );
  } else if (locate === 'locating') {
    below = <div className="row" role="status"><div className="spinner" aria-hidden="true" /><span>Finding your location…</span></div>;
  } else if (locate === 'new') {
    below = (
      <div className="stack-sm selected-space">
        <div className="row between"><h2 className="h-sm">Nothing documented here yet</h2><button type="button" className="link-btn small" onClick={back}>Clear</button></div>
        <p className="small">You’re at {me.lat.toFixed(4)}, {me.lng.toFixed(4)}. No space on the platform is within {NEARBY_M} m. If you’re standing somewhere worth documenting, add it: photos taken here count in full.</p>
        <div><Button variant="primary" onClick={() => addPlace('')}>{isMember ? 'Document this place' : 'Sign up to document this place'}</Button></div>
      </div>
    );
  } else if (q.trim()) {
    below = (
      <div className="map-results" aria-live="polite">
        {results.length > 0 ? (
          <>
            <p className="xs muted">{results.length} {results.length === 1 ? 'space' : 'spaces'}{point ? ` within 500 m of ${point.lat}, ${point.lng}` : ' on the map'}</p>
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
            <p className="small">{point ? `No documented spaces within 500 m of ${point.lat}, ${point.lng}.` : `No space called “${q.trim()}” yet.`}</p>
            <div><Button variant="primary" onClick={() => addPlace(point ? '' : q.trim())}>{isMember ? 'Add this place' : 'Sign up to add this place'}</Button></div>
          </div>
        )}
      </div>
    );
  }
  const content = (
    <>
      <h1>The stoop, the stepwell, the courtyard in between.</h1>
      <p className="small">A map of everyday in-between spaces in Jaipur, documented by the people who use them. Architects propose redesigns, and the platform is a co-op owned by its members.</p>
      <form onSubmit={(e) => { e.preventDefault(); if (results.length === 1) select(results[0]); }}>
        <label htmlFor="map-q" className="small bold">Search for a space</label>
        <input id="map-q" className="input" type="search" value={q} onChange={(e) => { setQ(e.target.value); if (selectedId) setSelectedId(null); }} placeholder="Search location or lat, lon" autoComplete="off" />
      </form>
      <div><Button onClick={locateMe}><Icon name="locate" />Use my location</Button></div>
      {below}
    </>
  );

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

// First visit without an account: what is an interstitial space?
function IntroOverlay() {
  const { state, dispatch, isMember } = useDemo();
  if (isMember || state.introSeen) return null;
  const close = () => dispatch({ type: 'INTRO_SEEN' });
  return (
    <Modal title="What is an interstitial space?" onClose={close} wide>
      <div className="intro">
        <p className="lead">The places between places: a stoop, the steps of a stepwell, the edge of a courtyard, the shade inside a city gate. Nobody designed them for what people do there, but people wait, sell, play and rest in them every day.</p>
        <ul className="intro-points">
          <li><span className="bold">Residents</span> document how these spaces feel and vote for the ones that should be redesigned.</li>
          <li><span className="bold">Architects</span> measure them and propose redesigns.</li>
          <li><span className="bold">Civic bodies and sponsors</span> fund the ones people vote for, through contests.</li>
        </ul>
        <p className="small muted">This map shows every space documented so far in Jaipur.</p>
      </div>
      <FormActions>
        <Button to="/about" onClick={close}>Learn more about us</Button>
        <Button variant="primary" onClick={close}>Explore the map</Button>
      </FormActions>
    </Modal>
  );
}

// The landing page is map first (round 10). ClassicLanding stays for the sandbox.
export function Landing() {
  return (
    <>
      <MapLanding />
      <IntroOverlay />
    </>
  );
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
  const [country, setCountry] = useState('all');
  const [city, setCity] = useState('all');
  const [sort, setSort] = useState('votes');
  const [hover, setHover] = useState(null);
  const limited = !isMember && state.signupDismissed;
  // A "lat, lon" search finds spaces near that point, nearest first; anything else matches text.
  const point = parseLatLng(q);
  const near = (s) => distanceM(point, s) <= NEAR_POINT_M;
  // Location narrows everything else: the city list follows the country, and the
  // type list only offers types that exist in the chosen place.
  const inPlace = visibleSpaces.filter((s) => (country === 'all' || s.country === country) && (city === 'all' || s.city === city));
  const countries = [...new Set(visibleSpaces.map((s) => s.country).filter(Boolean))].sort();
  const cities = [...new Set(visibleSpaces.filter((s) => country === 'all' || s.country === country).map((s) => s.city).filter(Boolean))].sort();
  const types = ['all', ...[...new Set(inPlace.map((s) => s.type))].sort()];
  const typeNow = types.includes(type) ? type : 'all';
  const list = inPlace
    .filter((s) => STATUSES[status].test(s) && (typeNow === 'all' || s.type === typeNow) && (point ? near(s) : matchesSearch(s, q)))
    .sort(point ? (a, b) => distanceM(point, a) - distanceM(point, b) : SORTS[sort].fn);
  const hidden = limited ? list.slice(VISITOR_LIMIT).map((s) => s.id) : [];
  return (
    <Page tag="simulated" wide>
      <div className="browse">
        <div className="stack">
          <h1>Browse spaces</h1>
          <div className="field">
            <label htmlFor="browse-q">Search</label>
            <input id="browse-q" className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Enter address or lat, lon" autoComplete="off" aria-describedby="browse-q-hint" />
            <span id="browse-q-hint" className="xs muted">For example Johari Bazaar, or 26.9239, 75.8267</span>
          </div>
          <div className="row row-end filters">
            <Select label="Country" value={country} onChange={(e) => { setCountry(e.target.value); setCity('all'); }} options={[{ value: 'all', label: 'All countries' }, ...countries.map((c) => ({ value: c, label: c }))]} />
            <Select label="City" value={city} onChange={(e) => setCity(e.target.value)} options={[{ value: 'all', label: 'All cities' }, ...cities.map((c) => ({ value: c, label: c }))]} />
            <Select label="Type" value={typeNow} onChange={(e) => setType(e.target.value)} options={types.map((t) => ({ value: t, label: t === 'all' ? `All types in ${city !== 'all' ? city : country !== 'all' ? country : 'all places'}` : typeLabel(t) }))} />
          </div>
          <div className="row row-end">
            <fieldset className="segmented">
              <legend>Status</legend>
              <div className="segmented-track">
                {Object.entries(STATUSES).map(([id, o]) => (
                  <label key={id} className="segment">
                    <input type="radio" name="status" value={id} checked={status === id} onChange={() => setStatus(id)} />
                    <span>{o.label} <span className="muted">{inPlace.filter(o.test).length}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
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
            <div className="stack-sm browse-empty">
              <h2 className="h-sm">No spaces match{q.trim() ? ` “${q.trim()}”` : ''}</h2>
              <p className="small muted">Try another search, or document it yourself if it’s missing.</p>
              <div><Button variant="primary" to={`/space/new${q.trim() ? `?name=${encodeURIComponent(q.trim())}` : ''}`} onClick={(e) => !need('upload') && e.preventDefault()}>Create new interstitial space</Button></div>
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
      {isMember && <DemoOnly><p className="demo-note">You’re signed in. Switch to Visitor in Demo controls to try sign-up from scratch.</p></DemoOnly>}
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

// Terms of Use, rewritten in round 13 for the current model: free and paid tiers,
// ghost points, paid-only payouts, experiences as votes, the Base Library,
// archived rounds, collaborators and contests.
const TERMS = [
  ['accounts', 'Accounts and membership', [
    ['Who can join', 'Anyone 16 or older can make a free account. Architects and architecture students can also ask to be verified, using their register number or school.'],
    ['Free tier', 'Document spaces, add your experience, vote in the co-op and browse everything. Your contributions are tallied as ghost points so you can see what you would have earned.'],
    ['Paid tier', 'Billed monthly, cancel any time. Paid members collect real points, get 10 free 3D-model downloads a month (no rollover) and can request to host contests.'],
    ['The co-op', 'Every account, free or paid, is a member of the co-operative with one vote on its decisions.'],
  ]],
  ['points', 'Points, payouts and the surplus', [
    ['Earning points', 'Contributions earn points: photos and scans once a space qualifies, experiences, diagrams, redesigns and moderator reviews. Contributions made on site earn more than those made remotely. The current rates are on the Points page.'],
    ['Who collects points', 'Only paid members. On the free tier, points are ghost points. They have no cash value, can’t be spent and don’t convert when you upgrade. Points count from the day you start the paid tier.'],
    ['Year-end surplus', 'After costs, any surplus for the financial year is shared among paid members in proportion to the points they collected that year. Spending points doesn’t reduce your share.'],
    ['Who is paid out', 'Only paid members are paid out, both for their surplus share and for their redesign sales. Payouts open when the financial year closes (31 March, placeholder).'],
    ['Leaving', 'If you move to the free tier, you can still request a payout of what you earned while paid. If you delete your account, you lose your points, so request anything you are owed first.'],
  ]],
  ['documenting', 'Documenting spaces', [
    ['What you can document', 'Spaces you can see from public ground. Your photos need location data so the space can be placed on the map.'],
    ['Licence', 'Photos, scans, questionnaire answers and experiences are shared under a Creative Commons licence and stay open. You keep ownership of what you upload.'],
    ['Approval', 'A new space shows as Pending until architects confirm it qualifies against the published criteria. Points for it arrive then.'],
    ['Experiences and votes', 'Each person has one experience per space and can update it. Rating a space’s need for redesign 6 or more out of 10 counts as one vote to redesign it.'],
    ['When a space changes', 'If a space is rebuilt or changes on the ground, a moderator confirms the update. Everything contributed before it moves to the space’s Archived tab, where it stays visible and credited, and votes start again.'],
    ['Private owners', 'An owner can request removal of a space on their property with proof of ownership. The team reviews each request.'],
  ]],
  ['library', 'Spatial diagrams and 3D models (the Base Library)', [
    ['What it is', 'Each space can have several spatial diagrams, drawn by AI from photos or measured by architects, and one 3D model that AI builds from all of them plus any uploaded models and scans.'],
    ['Your uploads', 'You keep copyright of the files you upload and license them to the Base Library. You are credited on the space and on every download.'],
    ['Sales', 'Diagrams and 3D models are sold as downloads. The platform keeps the download fee; it funds the platform and any surplus returns to members.'],
  ]],
  ['redesigns', 'Redesigns', [
    ['Copyright and share', 'Architects keep copyright of their redesigns and receive 80% of each sale; the platform keeps 20%.'],
    ['Limits', 'One redesign per space per architect each week. You can publish new versions; buyers are offered the update.'],
    ['Collaborators', 'You can credit collaborators, by name or by email invitation. They are notified and credited. Sharing earnings with them is between you and them; the platform pays the uploader.'],
    ['Licences for buyers', 'Standard licence: use and adapt the files for your own project, no redistribution. Full design rights (for agencies): the right to build and adapt the design for construction at a set price. The architect is always credited.'],
    ['Taken down or unpublished', 'People who bought a listing keep their copy.'],
  ]],
  ['contests', 'Contests', [
    ['Hosting', 'Paid members and partners can request to host. The co-host funds the prize, sets the brief and criteria, and judges.'],
    ['Entering', 'Eligibility is set per contest: licensed architects, accredited students, or both.'],
    ['Winning', 'The winning architect receives the full prize and sells the design to the co-host.'],
  ]],
  ['conduct', 'Conduct and moderation', [
    ['Reports', 'Anyone can report a listing, a contribution or a change to a space. Moderators review reports and can take content down.'],
    ['Accuracy', 'Don’t upload work that isn’t yours, and don’t misrepresent where a photo was taken.'],
  ]],
  ['ending', 'Ending your account, or the platform', [
    ['Deleting your account', 'Removes your profile and your points. Documentation you shared stays under its Creative Commons licence, credited as “Former member”.'],
    ['If the platform shuts down', 'Contributors keep their work, and the Base Library is released openly.'],
  ]],
];

export function Terms() {
  return (
    <Page narrow tag="simulated">
      <article className="stack-lg terms">
        <header className="stack-sm">
          <h1>Terms of Use</h1>
          <p className="muted">A plain-language summary. Last updated 18 November 2026.</p>
        </header>
        <nav aria-label="On this page" className="card stack-sm">
          <h2 className="h-xs">On this page</h2>
          <ol className="small toc">
            {TERMS.map(([id, title]) => <li key={id}><a href={`#terms-${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`terms-${id}`)?.scrollIntoView(); }}>{title}</a></li>)}
          </ol>
        </nav>
        {TERMS.map(([id, title, rows]) => (
          <section key={id} className="stack-sm" aria-labelledby={`terms-${id}`}>
            <h2 id={`terms-${id}`} className="h-sm">{title}</h2>
            <dl className="dl dl-wide">
              {rows.map(([t, d]) => <div key={t} className="dl-row"><dt>{t}</dt><dd>{d}</dd></div>)}
            </dl>
          </section>
        ))}
      </article>
    </Page>
  );
}

// A member's public profile: what they've documented and shared. Points and tier stay private.
export function MemberProfile() {
  const { id } = useParams();
  const { state, get, user } = useDemo();
  const u = get.user(id);
  if (!u) return <Page narrow><Empty title="Member not found"><div><Button to="/browse">Browse spaces</Button></div></Empty></Page>;
  if (u.role === 'architect') return <Navigate to={`/architect/${u.id}`} replace />;
  const documented = state.spaces.filter((s) => s.uploadedBy === u.id && !s.removed);
  const experiences = state.comments.filter((c) => c.userId === u.id && !c.archived);
  const photos = state.spaces.reduce((n, s) => n + s.photos.filter((p) => p.credit === u.id).length, 0);
  return (
    <Page narrow>
      <div className="stack-sm">
        <h1>{u.name}{user?.id === u.id ? ' (you)' : ''}</h1>
        <p className="muted">{u.role === 'paid' ? 'Organisation' : 'Community member'}{u.city ? `, ${u.city}` : ''}</p>
        {user?.id === u.id && <div><Button to="/profile">Edit your profile</Button></div>}
      </div>
      <dl className="dl">
        <dt>Spaces documented</dt><dd>{documented.length}</dd>
        <dt>Experiences shared</dt><dd>{experiences.length}</dd>
        <dt>Photos</dt><dd>{photos}</dd>
      </dl>
      <section className="stack-sm" aria-labelledby="member-spaces">
        <h2 id="member-spaces" className="h-sm">Spaces documented</h2>
        {documented.length ? (
          <div className="related-list">{documented.map((s) => <SpaceCard key={s.id} space={s} variant="row" headingLevel={3} />)}</div>
        ) : <p className="small muted">None yet.</p>}
      </section>
      <section className="stack-sm" aria-labelledby="member-exp">
        <h2 id="member-exp" className="h-sm">Experiences</h2>
        {experiences.length ? (
          <ul className="stack-sm plain-list">
            {experiences.map((c) => <li key={c.id} className="small"><Link to={`/space/${c.spaceId}?tab=experience`}>{get.space(c.spaceId)?.name}</Link>: “{c.text}”</li>)}
          </ul>
        ) : <p className="small muted">None yet.</p>}
      </section>
    </Page>
  );
}

// Footer pages: short placeholders for the class demo.
export function About() {
  return (
    <Page narrow tag="simulated">
      <article className="stack-lg about">
        <header className="stack-sm">
          <h1>About us</h1>
          <p className="lead">We document the in-between places of a city and help the people who use them get them redesigned.</p>
        </header>
        <section className="stack-sm" aria-labelledby="about-what">
          <h2 id="about-what" className="h-sm">What is an interstitial space?</h2>
          <p className="prose">An interstitial space sits between other places: the steps of a stepwell, a shopfront plinth, a niche in a city gate, the edge of a courtyard where a lane comes in. Nobody planned them for what happens there, yet they are where people wait, sell, rest and children play. They rarely appear on any plan, so they are rarely looked after.</p>
        </section>
        <section className="stack-sm" aria-labelledby="about-why">
          <h2 id="about-why" className="h-sm">What we’re trying to do</h2>
          <ul className="list-plain">
            <li>Put these spaces on the map, with how they feel to the people who use them.</li>
            <li>Let the community decide which ones most need a redesign, by voting.</li>
            <li>Give architects measured diagrams to design from, and pay them when their redesigns are downloaded.</li>
            <li>Help civic bodies and sponsors fund the redesigns people asked for, through contests.</li>
            <li>Run it as a co-operative: members vote on decisions and share any surplus.</li>
          </ul>
        </section>
        <section className="stack-sm" aria-labelledby="about-who">
          <h2 id="about-who" className="h-sm">Who it’s for</h2>
          <dl className="dl dl-wide">
            <dt>Residents and visitors</dt><dd>Document a space, share your experience, vote for what should change. Free.</dd>
            <dt>Architects and students</dt><dd>Measure spaces, approve new ones, publish redesigns and enter contests. Verified by register or school.</dd>
            <dt>Civic bodies and sponsors</dt><dd>Find the spaces people care about, buy designs, and co-host contests.</dd>
            <dt>Property owners</dt><dd>Ask for a space on your property to be removed, no account needed.</dd>
          </dl>
        </section>
        <div className="row"><Button variant="primary" to="/browse">Browse spaces</Button><Button to="/architects">For architects</Button></div>
        <p className="small muted">A class project for New Economies and Societies at Parsons. All content is placeholder.</p>
      </article>
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
