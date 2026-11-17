import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Button, Choice, ImageBox, Input, Page, Select } from '../components/ui.jsx';
import { MapBox, SpaceCard } from '../components/domain.jsx';

const VISITOR_LIMIT = 10;

export function Landing() {
  const { visibleSpaces, isMember } = useDemo();
  return (
    <Page tag="simulated">
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
      <section className="grid">
        <div className="card"><h3>Document</h3><p className="small">Photograph a space, say how it feels and what should change. Free and open under Creative Commons.</p></div>
        <div className="card"><h3>Measure</h3><p className="small">Photos become a measured spatial diagram, drawn by AI or uploaded by an architect.</p></div>
        <div className="card"><h3>Redesign</h3><p className="small">Architects sell redesigns and keep 80% and their copyright. Co-hosts fund contests for specific spaces.</p></div>
        <div className="card"><h3>Own it together</h3><p className="small">Every account is one co-op vote. Any year-end surplus goes back to members by points.</p></div>
      </section>
      <section className="stack">
        <div className="row between"><h2>Recently documented</h2><Link to="/browse">See all {visibleSpaces.length} spaces</Link></div>
        <div className="grid">{visibleSpaces.slice(0, 4).map((s) => <SpaceCard key={s.id} space={s} />)}</div>
      </section>
      <p className="small muted">All spaces, people, prices and organisations in this prototype are placeholders. <Link to="/terms">Terms summary</Link></p>
    </Page>
  );
}

const SORTS = {
  votes: { label: 'Most votes', fn: (a, b) => b.votes - a.votes },
  photos: { label: 'Most photos', fn: (a, b) => b.photos.length - a.photos.length },
  name: { label: 'Name (A to Z)', fn: (a, b) => a.name.localeCompare(b.name) },
};

export function Browse() {
  const { visibleSpaces, isMember, state, need } = useDemo();
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('votes');
  const [hover, setHover] = useState(null);
  const limited = !isMember && state.signupDismissed;
  // Rank by community votes across every space, whatever the current sort or filter.
  const byVotes = [...visibleSpaces].sort(SORTS.votes.fn).map((s) => s.id);
  const list = visibleSpaces.filter((s) => type === 'all' || s.type === type).sort(SORTS[sort].fn);
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
          <div className="row">
            <Select label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)} options={Object.entries(SORTS).map(([value, o]) => ({ value, label: o.label }))} />
            <Select label="Type" value={type} onChange={(e) => setType(e.target.value)} options={types.map((t) => ({ value: t, label: t === 'all' ? 'All types' : t }))} />
            <span className="small muted">{list.length} spaces. Votes decide which spaces get attention.</span>
          </div>
          {limited && (
            <p className="note">You’re browsing without an account, so {VISITOR_LIMIT} spaces are shown and the rest are blurred. <Link to="/signup">Sign up to see all {visibleSpaces.length}</Link></p>
          )}
          <div className="grid grid-tight">
            {list.map((s, i) => (
              <SpaceCard key={s.id} space={s} number={i + 1} voteRank={byVotes.indexOf(s.id) + 1} faded={hidden.includes(s.id)} active={hover === s.id} onHover={setHover} />
            ))}
          </div>
        </div>
        <MapBox spaces={list} hiddenIds={hidden} activeId={hover} onHover={setHover} sticky />
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
