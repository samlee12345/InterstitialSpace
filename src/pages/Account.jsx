import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Badge, Button, Choice, DemoOnly, Empty, FileDrop, FormActions, Icon, ImageBox, Input, Modal, Opt, Page, RoleGate, StatusBadges } from '../components/ui.jsx';
import { Crumbs } from '../components/domain.jsx';
import { surplusShare } from '../lib/points.js';
import { POINTS, fmtPoints } from '../lib/points.js';

// Free vs paid, side by side. "See the paid tier" links land here.
const PLAN_ROWS = [
  ['Document spaces, add your experience and vote', true, true],
  ['One vote in the co-op', true, true],
  ['Points for your contributions', true, true],
  ['Spend points on 3D-model and diagram downloads', true, true],
  ['Share of the year-end surplus', 'Shown as ghost dollars: what you would have received', true],
  ['Payouts for redesign sales and your surplus share', false, true],
  ['Free 3D-model downloads', 'None', (c) => `${c.paidFreeModels} a month, no rollover`],
  ['Request to host a contest', false, true],
];
export function Membership() {
  const { user, cfg } = useDemo();
  const cell = (v) => {
    const x = typeof v === 'function' ? v(cfg) : v;
    if (x === true) return <span className="plan-yes"><Icon name="check" /><span className="visually-hidden">Included</span></span>;
    if (x === false) return <span className="plan-no" aria-label="Not included">—</span>;
    return x;
  };
  return (
    <Page>
      <div className="stack-sm">
        <h1>Free and paid membership</h1>
        <p className="prose muted">Everyone is a co-op member with one vote. The paid tier is how you collect points that turn into your share of the year-end surplus.</p>
      </div>
      <div className="table-wrap">
        <table className="plan-table">
          <caption className="visually-hidden">What each membership includes</caption>
          <thead>
            <tr>
              <th scope="col"><span className="visually-hidden">Feature</span></th>
              <th scope="col"><span className="plan-name">Free</span><span className="small muted">$0</span>{user && !user.paid && <Badge>Your plan</Badge>}</th>
              <th scope="col"><span className="plan-name">Paid</span><span className="small muted">{cfg.priceLabel} a month, cancel any time</span>{user?.paid && <Badge kind="solid">Your plan</Badge>}</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_ROWS.map(([label, free, paid]) => (
              <tr key={label}><th scope="row">{label}</th><td>{cell(free)}</td><td>{cell(paid)}</td></tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td />
              <td>{!user && <Button to="/signup">Create a free account</Button>}</td>
              <td>{user && !user.paid ? <Button variant="primary" to="/points?upgrade=1">Upgrade to paid</Button> : !user ? <Button variant="primary" to="/signup?plan=paid">Create an account, then upgrade</Button> : <Button to="/points">Manage membership</Button>}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="small muted">Only points earned from the day you upgrade count toward a surplus share. Points from the free tier stay yours to spend on downloads. Payouts open when the financial year closes.</p>
    </Page>
  );
}

export function Points() {
  const { state, dispatch, user, cfg } = useDemo();
  const [up, setUp] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] || '').get('upgrade') === '1');
  const [method, setMethod] = useState('card');
  if (!user) return <Page narrow tag="simulated"><RoleGate title="Sign in to see points">Points are only shown to members.</RoleGate></Page>;
  const ledger = state.ledger.filter((l) => l.userId === user.id);
  // Everyone collects points and can spend them on downloads. Only paid members
  // get a year-end surplus share; free members see it as ghost dollars.
  const share = surplusShare(state, user, cfg);
  const downloads = Math.floor(user.points / cfg.modelPointsCost);
  const ghost = !user.paid;
  return (
    <Page>
      <h1>Points and membership</h1>
      <div className="grid">
        <div className="card">
          <span className="small muted">Your points</span>
          <span className="display">{fmtPoints(user.points)}</span>
          <span className="small muted">Worth {downloads} {downloads === 1 ? 'download' : 'downloads'} of a 3D model or spatial diagram, at {cfg.modelPointsCost} points each. {fmtPoints(user.lifetime)} collected this year.</span>
        </div>
        <div className={`card${ghost ? ' card-ghost' : ''}`}>
          <span className="small muted">{ghost ? 'Ghost dollars: unrealized surplus share' : 'Estimated year-end surplus share'}</span>
          <span className="display">${share.toFixed(2)}</span>
          <span className="small muted">
            {ghost
              ? 'What your points this year would be worth as a share of the year-end surplus if you were a paid member. You won’t receive it on the free tier.'
              : 'Estimate from the points you collected as a paid member this year. Points you spent still count.'}
            {` Placeholder surplus of $${cfg.surplusPoolPlaceholder.toLocaleString()}.`}
          </span>
        </div>
        <div className="card">
          <span className="small muted">Co-op</span>
          <span className="display">1 vote</span>
          <span className="small muted">Every account is a member with one vote, free or paid.</span>
          <Link to="/co-op">See co-op decisions</Link>
        </div>
      </div>

      <section className="card">
        <div className="row">
          <h2>Paid tier</h2>
          {user.paid && <Badge kind="solid">Active this month</Badge>}
        </div>
        {user.paid ? (
          <>
            <h3>{user.freeModelsLeft} of {cfg.paidFreeModels} free model downloads left this month</h3>
            <p className="small muted">Your points this year count toward your share of the year-end surplus. Unused downloads don’t roll over. After {cfg.paidFreeModels}, models cost {cfg.priceLabel} or {cfg.modelPointsCost} points each. You can also request to host contests.</p>
            <div className="row"><Button to="/contest/request">Request to host a contest</Button><Button to="/browse">Find a measured model</Button></div>
          </>
        ) : (
          <>
            <p className="prose"><strong>Only paid members get a share of the year-end surplus.</strong> Points you collect while paid add up to that share, paid out after the financial year closes.</p>
            <p className="note small">Points you earn on the free tier stay yours to spend on downloads, but they won’t count toward a surplus share if you upgrade later. Only points earned from the day you upgrade do.</p>
            <p className="small muted">Billed monthly, cancel anytime. Also includes {cfg.paidFreeModels} free measured-model downloads a month (no rollover) and the ability to request to host contests.</p>
            <div className="row"><Button variant="primary" onClick={() => setUp(true)}>Upgrade</Button><Link to="/membership" className="small">Compare free and paid</Link></div>
          </>
        )}
      </section>

      <section className="halves">
        <div className="stack">
          <h2>How points are earned</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Action</th><th className="num">On site</th><th className="num">Off site</th></tr></thead>
              <tbody>
                <tr><td>Your first experience on a space</td><td className="num">{fmtPoints(POINTS.interactOnSite)}</td><td className="num">{fmtPoints(POINTS.interactOffSite)}</td></tr>
                <tr><td>Photo, when the space is approved (creator only)</td><td className="num">{fmtPoints(POINTS.photo)}</td><td className="num">Needs location data</td></tr>
                <tr><td>Each optional detail when documenting a space</td><td className="num">{fmtPoints(POINTS.field)}</td><td className="num">{fmtPoints(POINTS.field)}</td></tr>
                <tr><td>Redesign</td><td className="num">{fmtPoints(POINTS.redesign)}</td><td className="num">{fmtPoints(POINTS.redesign)}</td></tr>
                <tr><td>Approval review</td><td className="num">{fmtPoints(POINTS.review)}</td><td className="num">{fmtPoints(POINTS.review)}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="small muted">Off site also covers continuing without sharing your location. Photos without location data can’t be used to document a space.</p>
        </div>
        <div className="stack">
          <h2>Your history</h2>
          <ul className="list small">
            {ledger.map((l) => <li key={l.id} className="row between"><span>{l.text}</span><span className="bold">{l.pts > 0 ? '+' : ''}{fmtPoints(l.pts)}</span></li>)}
            {ledger.length === 0 && <li className="muted">No activity yet.</li>}
          </ul>
        </div>
      </section>

      {up && (
        <Modal title="Upgrade to the paid tier" onClose={() => setUp(false)}>
          <p>Monthly. Cancel any time. Points you earn from today count toward your year-end surplus share.</p>
          <Choice name="up" checked={method === 'card'} onChange={() => setMethod('card')} title={`${cfg.priceLabel} a month by card`} />
          <DemoOnly><p className="demo-note">No payment is taken.</p></DemoOnly>
          <p className="small muted">Points can’t pay for the upgrade. Once you’re a paid member, you can renew with points.</p>
          <div className="row">
            <Button
              variant="primary"
              onClick={() => {
                dispatch({ type: 'UPGRADE', userId: user.id, method });
                setUp(false);
              }}
            >
              Start paid tier
            </Button>
            <Button onClick={() => setUp(false)}>Cancel</Button>
          </div>
        </Modal>
      )}
    </Page>
  );
}

export function Coop() {
  const { state, dispatch, user } = useDemo();
  if (!user) return <Page narrow tag="simulated"><RoleGate title="Members only">Every account holder gets one co-op vote.</RoleGate></Page>;
  const open = state.coopDecisions.filter((d) => d.status === 'open');
  const past = state.coopDecisions.filter((d) => d.status !== 'open');
  return (
    <Page narrow tag="simulated">
      <header className="stack-sm">
        <h1>Co-op</h1>
        <p className="muted">The platform is owned by its members. One account, one vote.</p>
      </header>
      <section className="stack">
        <h2>Open now</h2>
        {open.map((d) => (
          <div key={d.id} className="card">
            <h3>{d.title}</h3>
            <span className="small muted">Voting closes {d.closes}</span>
            {d.votes[user.id] ? (
              <p className="bold">You voted {d.votes[user.id]}.</p>
            ) : (
              <div className="row">
                <Button variant="primary" onClick={() => dispatch({ type: 'COOP_VOTE', id: d.id, userId: user.id, vote: 'Yes' })}>Vote yes</Button>
                <Button onClick={() => dispatch({ type: 'COOP_VOTE', id: d.id, userId: user.id, vote: 'No' })}>Vote no</Button>
              </div>
            )}
          </div>
        ))}
      </section>
      <section className="stack">
        <h2>Past decisions</h2>
        <ul className="list">
          {past.map((d) => (
            <li key={d.id} className="stack-sm">
              <span className="bold">{d.title}</span>
              <span className="small">{d.result}. Closed {d.closes}.</span>
              <span className="small muted">{d.votes[user.id] ? `You voted ${d.votes[user.id]}.` : 'You did not vote.'}</span>
            </li>
          ))}
        </ul>
      </section>
    </Page>
  );
}

// Everything the user has done on each space: documented it, posted experiences,
// added photos, drew its diagram, published redesigns, entered its contests.
// Status with a coloured icon and a word, so it doesn't rely on colour alone.
const STATUS = {
  pending: { label: 'Pending', icon: <><circle cx="10" cy="10" r="8.5" /><path d="M7.6 7.6a2.4 2.4 0 1 1 3.3 2.2c-.6.3-.9.8-.9 1.4v.5" /><circle cx="10" cy="14.4" r=".6" className="dot" /></> },
  rejected: { label: 'Declined', icon: <><circle cx="10" cy="10" r="8.5" /><path d="M7 7l6 6M13 7l-6 6" /></> },
  approved: { label: 'Approved', icon: <><circle cx="10" cy="10" r="8.5" /><path d="M6 10.3l2.7 2.7L14 7.6" /></> },
};
function StatusIcon({ status }) {
  const st = STATUS[status] || STATUS.pending;
  return (
    <span className={`status-icon status-${status}`}>
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{st.icon}</svg>
      {st.label}
    </span>
  );
}

export function Contributions() {
  const { state, user } = useDemo();
  if (!user) return <Page tag="simulated"><RoleGate title="Sign in to see your contributions">Visitors have no contributions.</RoleGate></Page>;
  const rows = state.spaces.map((s) => {
    const did = [];
    if (s.uploadedBy === user.id) did.push('Documented it');
    const exp = state.comments.filter((c) => c.spaceId === s.id && c.userId === user.id);
    if (exp.length) did.push(`${exp.length} ${exp.length === 1 ? 'experience' : 'experiences'}`);
    const ph = s.photos.filter((p) => p.credit === user.id).length;
    if (ph) did.push(`${ph} ${ph === 1 ? 'photo' : 'photos'}`);
    if (s.diagrams?.some((d) => d.by === user.id)) did.push('Spatial diagram');
    const rd = state.redesigns.filter((r) => r.spaceId === s.id && r.architectId === user.id).length;
    if (rd) did.push(`${rd} ${rd === 1 ? 'redesign' : 'redesigns'}`);
    const en = state.contests.filter((c) => c.spaceId === s.id).flatMap((c) => c.entries).filter((e) => e.architectId === user.id).length;
    if (en) did.push(`${en} contest ${en === 1 ? 'entry' : 'entries'}`);
    // The most recent date of anything you contributed here.
    const dates = [
      s.uploadedBy === user.id && s.addedAt,
      ...exp.map((c) => c.updatedAt || c.date),
      ...state.redesigns.filter((r) => r.spaceId === s.id && r.architectId === user.id).map((r) => new Date(r.createdAt).toISOString().slice(0, 10)),
      ...state.contests.filter((c) => c.spaceId === s.id).flatMap((c) => c.entries).filter((e) => e.architectId === user.id).map((e) => e.submittedAt),
      ...state.diagramUploads.filter((d) => d.spaceId === s.id && d.userId === user.id).map((d) => d.date),
    ].filter(Boolean).sort();
    return { s, did, latest: dates[dates.length - 1] || null };
  }).filter((r) => r.did.length);
  const live = rows.filter((r) => !r.s.removed).sort((a, b) => (b.latest || '').localeCompare(a.latest || ''));
  return (
    <Page>
      <header className="stack-sm">
        <h1>Contributions</h1>
        <p className="muted">Every space you have documented, posted about, photographed, measured or redesigned.</p>
      </header>
      <section className="stack" aria-labelledby="contrib-h">
        <h2 id="contrib-h">Spaces ({live.length})</h2>
        {live.length === 0 ? (
          <Empty title="Nothing yet"><p>Document a space, or add your experience to one you use.</p><div><Button to="/browse">Browse spaces</Button></div></Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Space</th><th>Status</th><th>What you contributed</th><th>Latest contribution</th></tr></thead>
              <tbody>
                {live.map(({ s, did, latest }) => (
                  <tr key={s.id}>
                    <td><Link to={`/space/${s.id}`}>{s.name}</Link></td>
                    <td><StatusIcon status={s.status} /></td>
                    <td>{did.join(', ')}</td>
                    <td>{latest ? new Date(latest).toLocaleDateString(undefined, { timeZone: 'UTC' }) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <HostedContests />
    </Page>
  );
}

// Contests you host (as co-host), plus requests the team is still reviewing.
const HOST_STATUS = {
  review: ['Under team review', ''],
  live: ['Open for entries', ''],
  judging: ['Ready to judge', 'accent'],
  closed: ['Winner announced', ''],
};
function HostedContests() {
  const { state, user, isPaid, get, dispatch } = useDemo();
  const hosted = state.contests.filter((c) => c.coHostId === user.id);
  const requests = (state.contestRequests || []).filter((r) => r.hostId === user.id);
  if (!isPaid && !hosted.length && !requests.length) return null;
  const order = { judging: 0, review: 1, live: 2, closed: 3 };
  const rows = [
    ...requests.map((r) => ({ id: r.id, title: `Contest for ${get.space(r.spaceId)?.name}`, status: 'review', prize: r.prize, when: `Requested ${new Date(r.date).toLocaleDateString()}`, entries: null })),
    ...hosted.map((c) => ({ id: c.id, title: c.title, status: c.status, prize: c.prize, when: c.status === 'live' ? `Entries close ${c.deadline}` : `Closed ${c.deadline}`, entries: c.entries.length, link: true })),
  ].sort((a, b) => order[a.status] - order[b.status]);
  return (
    <section className="stack" aria-labelledby="hosted-h" id="hosted">
      <div className="row between">
        <h2 id="hosted-h">Hosted contests ({rows.length})</h2>
        <Button to="/contest/request">Request to host a contest</Button>
      </div>
      {rows.length === 0 ? <p className="small muted">You haven’t hosted a contest yet.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Contest</th><th>Status</th><th>Entries</th><th>Prize</th><th>Dates</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.link ? <Link to={`/contest/${r.id}`}>{r.title}</Link> : r.title}</td>
                  <td>
                    {r.status === 'judging'
                      ? <Link to={`/contest/${r.id}/judge`} className="badge badge-accent badge-link">Ready to judge</Link>
                      : <Badge kind={HOST_STATUS[r.status][1]}>{HOST_STATUS[r.status][0]}</Badge>}
                    {r.status === 'review' && (
                      <button type="button" className="demo-btn demo-btn-inline" onClick={() => dispatch({ type: 'APPROVE_CONTEST_REQUEST', id: r.id })}>
                        <span className="demo-btn-tag" aria-hidden="true">Demo</span> Team approves
                      </button>
                    )}
                  </td>
                  <td>{r.entries ?? '—'}</td>
                  <td>{r.prize}</td>
                  <td className="small">{r.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// Account settings only: photo, details, account type, delete account.
export function Profile() {
  const { user, isArchitect, rankOf, dispatch } = useDemo();
  const [f, setF] = useState({ name: user?.name.replace(' (you)', '') || '', email: user ? `${user.id}@example.com` : '', city: user?.city || '', country: user?.country || '', linkedin: user?.links?.linkedin || '', instagram: user?.links?.instagram || '', website: user?.links?.website || '' });
  const [hasPhoto, setHasPhoto] = useState(false);
  const [del, setDel] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  if (!user) return <Page tag="simulated"><RoleGate title="Sign in to see your profile">Visitors have no profile.</RoleGate></Page>;
  const tier = isArchitect ? `Architect${user.verified ? ', verified' : ''}` : user.paid ? 'Paid account' : 'Community member';
  return (
    <Page narrow>
      <h1>Profile</h1>
      <section className="stack" aria-labelledby="photo-h">
        <h2 id="photo-h" className="h-sm">Profile photo</h2>
        <div className="row">
          <div className="avatar">{hasPhoto ? <ImageBox label="Photo" shape="square" /> : <span aria-hidden="true">{f.name.charAt(0)}</span>}</div>
          <Button onClick={() => setHasPhoto(true)}>{hasPhoto ? 'Change photo' : 'Upload photo'}</Button>
          {hasPhoto && <Button variant="quiet" onClick={() => setHasPhoto(false)}>Remove</Button>}
        </div>
      </section>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); dispatch({ type: 'SAVE_PROFILE', userId: user.id, city: f.city.trim(), country: f.country.trim(), links: { linkedin: f.linkedin.trim(), instagram: f.instagram.trim(), website: f.website.trim() } }); }}>
        <h2 className="h-sm">Your details</h2>
        <Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <div className="field-row">
          <Input label="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} autoComplete="address-level2" />
          <Input label="Country" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} autoComplete="country-name" />
        </div>
        <h3 className="h-xs">Links on your public profile<Opt /></h3>
        <p className="xs muted">Shown on your architect page and next to your experiences.</p>
        <Input label="LinkedIn" value={f.linkedin} onChange={(e) => setF({ ...f, linkedin: e.target.value })} placeholder="linkedin.com/in/your-name" />
        <Input label="Instagram" value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value })} placeholder="@yourhandle" />
        <Input label="Website" inputMode="url" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="yourstudio.com" />
        <FormActions><Button variant="primary" type="submit">Save changes</Button></FormActions>
      </form>
      <section className="stack" aria-labelledby="tier-h">
        <h2 id="tier-h" className="h-sm">Account</h2>
        <dl className="dl">
          <dt>Account type</dt><dd>{tier}{!isArchitect && <> <Link to="/architects?convert=1">Convert to an architect account</Link></>}</dd>
          <dt>Plan</dt><dd>{user.paid ? 'Paid tier, billed monthly' : 'Free'} <Link to={user.paid ? '/points' : '/membership'}>{user.paid ? 'Manage' : 'Compare free and paid'}</Link></dd>
          {isArchitect && <><dt>Verification</dt><dd>{user.licence}</dd><dt>Ranking</dt><dd>No. {rankOf(user.id)}</dd></>}
          <dt>Co-op</dt><dd>Member, one vote</dd>
        </dl>
      </section>
      <section className="danger-zone" aria-labelledby="del-h">
        <h2 id="del-h" className="h-sm">Delete account</h2>
        <p className="small">Your account, your {fmtPoints(user.points)} points and your co-op vote are removed. Points can’t be recovered or paid out. Purchases can’t be downloaded again afterwards.</p>
        <div><Button onClick={() => setDel(true)}>Delete account</Button></div>
      </section>
      {del && (
        <Modal title="Delete your account?" onClose={() => setDel(false)}>
          <p>This can’t be undone. You lose your {fmtPoints(user.points)} points. Type DELETE to confirm.</p>
          <Input label="Confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          <DemoOnly><p className="demo-note">Nothing is deleted in the demo.</p></DemoOnly>
          <FormActions>
            <Button onClick={() => setDel(false)}>Cancel</Button>
            <Button variant="primary" disabled={confirmText !== 'DELETE'} onClick={() => { setDel(false); dispatch({ type: 'TOAST', text: 'Account deletion requested' }); }}>Delete account</Button>
          </FormActions>
        </Modal>
      )}
    </Page>
  );
}

export function Removal() {
  const { spaceId } = useParams();
  const { get, dispatch } = useDemo();
  const space = get.space(spaceId);
  const [f, setF] = useState({ name: '', email: '', deed: [], why: '' });
  const [err, setErr] = useState('');
  if (!space) return <Page narrow><Empty title="Space not found"><div><Button to="/browse">Browse spaces</Button></div></Empty></Page>;

  const send = (e) => {
    e.preventDefault();
    if (!f.name.trim() || !f.email.includes('@')) return setErr('Enter your name and an email address so the team can reply.');
    if (f.deed.length === 0) return setErr('Upload a deed or other proof of ownership.');
    setErr('');
    return dispatch({ type: 'REMOVAL_REQUEST', spaceId });
  };

  return (
    <Page narrow tag="simulated">
      <Crumbs items={[[space.removed ? null : `/space/${space.id}`, space.name], [null, 'Request removal']]} />
      <h1>Request removal</h1>
      {!space.removal && (
        <form className="stack" onSubmit={send}>
          <p className="prose">If you own this property you can ask for “{space.name}” to be removed. You don’t need an account. The team (not moderators) reviews each request by hand.</p>
          <Input label="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <FileDrop label="Deed or equivalent proof of ownership" files={f.deed} onChange={(deed) => setF({ ...f, deed })} samples={['deed-scan.pdf']} />
          <Input label="Anything the team should know" optional textarea value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} />
          {err && <span className="error" role="alert">{err}</span>}
          <FormActions><Button to={`/space/${space.id}`}>Cancel</Button><Button variant="primary" type="submit">Send removal request</Button></FormActions>
        </form>
      )}
      {space.removal === 'review' && (
        <div className="stack">
          <div className="alert">
            <h2>Team review</h2>
            <p>Your request and deed were received. The space stays visible, marked “Removal under review”, until the team decides. You’ll get an email either way.</p>
          </div>
          <div className="card sunken">
            <span className="small bold">Simulation controls: what did the team decide?</span>
            <div className="row">
              <Button onClick={() => dispatch({ type: 'REMOVAL_RESOLVE', spaceId, removed: true })}>Team decides: remove</Button>
              <Button onClick={() => dispatch({ type: 'REMOVAL_RESOLVE', spaceId, removed: false })}>Team decides: keep</Button>
            </div>
          </div>
        </div>
      )}
      {space.removal === 'removed' && (
        <div className="alert">
          <h2>Removed</h2>
          <p>The space is hidden from the platform. People who contributed to it can still find their own work under Contributions, Removed spaces.</p>
          <div><Button to="/browse">Browse spaces</Button></div>
        </div>
      )}
      {space.removal === 'kept' && (
        <div className="alert">
          <h2>Kept</h2>
          <p>The team reviewed the request and kept the space, because it is visible from public ground or ownership could not be confirmed.</p>
          <div><Button to={`/space/${space.id}`}>Back to the space</Button></div>
        </div>
      )}
    </Page>
  );
}
