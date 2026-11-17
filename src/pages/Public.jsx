import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Button, Choice, ImageBox, Input, Page, Select } from '../components/ui.jsx';
import { MapBox, SpaceCard, matchesSearch } from '../components/domain.jsx';
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
      <div className="row small"><Link to="/co-op">How the co-op decides</Link><Link to="/terms">Terms summary</Link></div>
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

// Map-first landing (like OpenCelliD): the map is the page, with search and a short
// description on top. Searching for a place that isn't there offers to add it.
function MapLanding() {
  const { visibleSpaces, isMember, dispatch } = useDemo();
  const { landing } = useChoices();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [hover, setHover] = useState(null);
  const results = q.trim() ? visibleSpaces.filter((s) => matchesSearch(s, q)) : [];
  const pins = q.trim() ? results : visibleSpaces;
  const add = () => {
    const to = `/space/new?name=${encodeURIComponent(q.trim())}`;
    if (isMember) nav(to);
    else dispatch({ type: 'OPEN_SIGNUP', reason: 'upload', returnTo: to });
  };
  return (
    <>
      <main id="main" tabIndex={-1} data-screen-label="page" className="map-landing">
        <MapBox spaces={pins} area={visibleSpaces} activeId={hover} onHover={setHover} className="map-hero" label={null}>
          <div className="map-search" role="search">
            <h1>The stoop, the stepwell, the courtyard in between.</h1>
            <p className="small">A map of everyday in-between spaces in Jaipur, documented by the people who use them. Architects propose redesigns, and the platform is a co-op owned by its members.</p>
            <form onSubmit={(e) => { e.preventDefault(); if (results.length === 1) nav(`/space/${results[0].id}`); }}>
              <label htmlFor="map-q" className="small bold">Search for a space</label>
              <div className="row">
                <input id="map-q" className="input grow" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Stepwell, Johari Bazaar, shade…" autoComplete="off" />
              </div>
            </form>
            {q.trim() && (
              <div className="map-results" aria-live="polite">
                {results.length > 0 ? (
                  <>
                    <p className="xs muted">{results.length} {results.length === 1 ? 'space' : 'spaces'} on the map</p>
                    <ul className="list small">
                      {results.slice(0, 5).map((s) => (
                        <li key={s.id} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}>
                          <Link to={`/space/${s.id}`} className="bold">{s.name}</Link>
                          <span className="muted"> {s.votes} votes</span>
                        </li>
                      ))}
                    </ul>
                    {results.length > 5 && <Link className="small" to="/browse">See all {results.length} in Browse</Link>}
                  </>
                ) : (
                  <div className="stack-sm">
                    <p className="small">No space called “{q.trim()}” yet.</p>
                    <div><Button variant="primary" onClick={add}>{isMember ? 'Add this place' : 'Sign up to add this place'}</Button></div>
                  </div>
                )}
              </div>
            )}
          </div>
          <span className="map-label map-label-br">Map placeholder: Jaipur. Dashed pins are pending.</span>
        </MapBox>
        <div className="page stack-lg">
          {(LANDING_VARIANTS[landing] || LANDING_VARIANTS.steps).render()}
          <RecentlyDocumented />
        </div>
      </main>
    </>
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
  const list = visibleSpaces
    .filter((s) => STATUSES[status].test(s) && (type === 'all' || s.type === type) && matchesSearch(s, q))
    .sort(SORTS[sort].fn);
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
            <input id="browse-q" className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, area, or what people said: shade, steps, Johari Bazaar…" autoComplete="off" />
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
          <p className="small muted" aria-live="polite">{list.length} {list.length === 1 ? 'space' : 'spaces'}</p>
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
        <MapBox spaces={list} area={visibleSpaces} hiddenIds={hidden} activeId={hover} onHover={setHover} sticky />
      </div>
    </Page>
  );
}

export function Signup() {
  const { dispatch, isMember, state } = useDemo();
  const nav = useNavigate();
  // After sign-up, go back to whatever the visitor was trying to do.
  const back = state.returnTo || '/browse';
  const [kind, setKind] = useState('community');
  const [f, setF] = useState({ name: '', email: '', status: 'Licensed architect', licence: '' });
  const [phase, setPhase] = useState('form'); // form | verifying
  const [err, setErr] = useState('');

  useEffect(() => {
    if (phase !== 'verifying') return undefined;
    const t = setTimeout(() => {
      dispatch({ type: 'SIGNUP', kind });
      dispatch({ type: 'CLEAR_RETURN' });
      nav(back);
    }, 2600);
    return () => clearTimeout(t);
  }, [phase, kind, dispatch, nav, back]);

  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim() || !f.email.includes('@')) return setErr('Enter your name and an email address.');
    if (kind === 'architect' && !f.licence.trim()) return setErr('Enter your licence number or school.');
    setErr('');
    if (kind === 'architect') return setPhase('verifying');
    dispatch({ type: 'SIGNUP', kind });
    dispatch({ type: 'CLEAR_RETURN' });
    return nav(back);
  };

  if (phase === 'verifying') {
    return (
      <Page narrow tag="simulated">
        <div className="alert">
          <div className="row"><div className="spinner" aria-hidden="true" /><h1>Verifying…</h1></div>
          <p>Verifying via state/national databases, NCARB, NAAB.</p>
          <p className="small muted">Simulated. You’ll be signed in as an architect in a moment and taken back to where you were.</p>
        </div>
      </Page>
    );
  }
  return (
    <Page narrow tag="simulated">
      <h1>Sign up</h1>
      {isMember && <p className="note">You’re already signed in for this demo role. Switch to Visitor in the Demo panel to try sign-up from scratch.</p>}
      <form className="stack" onSubmit={submit}>
        <div className="field">
          <span className="label">What kind of account?</span>
          <Choice name="kind" checked={kind === 'community'} onChange={() => setKind('community')} title="Community member">Document spaces, comment, vote, and buy redesigns and models. Free.</Choice>
          <Choice name="kind" checked={kind === 'architect'} onChange={() => setKind('architect')} title="Architect">Everything above, plus upload redesigns and diagrams, enter contests, and a public portfolio. Free.</Choice>
        </div>
        <Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        {kind === 'architect' && (
          <>
            <Select label="Your status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={['Licensed architect', 'Accredited architecture student']} />
            <Input label={f.status === 'Licensed architect' ? 'Licence number' : 'School and programme'} value={f.licence} onChange={(e) => setF({ ...f, licence: e.target.value })} hint="We check this against state/national databases, NCARB and NAAB." />
          </>
        )}
        {err && <span className="error" role="alert">{err}</span>}
        <p className="small muted">Every account is a member of the co-op with one vote. <Link to="/terms">Terms summary</Link></p>
        <div><Button variant="primary" type="submit">Create account</Button></div>
      </form>
    </Page>
  );
}

export function Terms() {
  const rows = [
    ['Documentation of spaces', 'Photos, scans and questionnaire answers are shared under a Creative Commons licence and stay open. You keep ownership of what you upload.'],
    ['Redesigns and measured models', 'Sold under the platform purchase licence. Buyers can use and adapt the files. They cannot redistribute them.'],
    ['Architects', 'Keep copyright in their redesigns and receive 80% of each sale; the platform keeps 20%. They can publish one redesign a week. An agency can buy full design rights: the price and terms are agreed between the agency and the architect, and the architect must be credited.'],
    ['Spatial diagrams', 'The platform keeps the download fee for Base Library diagrams and models. Community photographers are credited.'],
    ['Contests', 'The co-host funds the prize, sets the criteria and judges. The winning architect sells the design to the co-host. Most of the prize goes to the winner; the platform takes a hosting share.'],
    ['Private owners', 'Anyone can document a space visible from public ground. An owner can request removal with proof of ownership; the team reviews each request.'],
    ['The co-op', 'Every account holder is a member with one vote. Any year-end surplus is returned to members by points.'],
    ['If the platform shuts down', 'Contributors keep their work.'],
  ];
  return (
    <Page narrow tag="simulated">
      <h1>Terms, on one page</h1>
      <p className="muted">A plain summary for the class demo, not legal text.</p>
      <dl className="stack">
        {rows.map(([t, d]) => (
          <div key={t} className="card"><dt className="bold">{t}</dt><dd>{d}</dd></div>
        ))}
      </dl>
    </Page>
  );
}
