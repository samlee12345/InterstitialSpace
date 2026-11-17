import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Badge, Button, Choice, Empty, FileDrop, FormActions, Input, Modal, Page, RoleGate, StatusBadges } from '../components/ui.jsx';
import { Crumbs } from '../components/domain.jsx';
import { fmtPoints } from '../lib/points.js';

export function Points() {
  const { state, dispatch, user, cfg } = useDemo();
  const [up, setUp] = useState(false);
  const [method, setMethod] = useState('card');
  if (!user) return <Page narrow tag="simulated"><RoleGate title="Sign in to see points">Points are only shown to members.</RoleGate></Page>;
  const ledger = state.ledger.filter((l) => l.userId === user.id);
  const totalLifetime = state.users.reduce((t, u) => t + (u.lifetime || 0), 0);
  const share = (user.lifetime / totalLifetime) * cfg.surplusPoolPlaceholder;
  const canPoints = user.points >= cfg.paidTierPointsCost;
  return (
    <Page tag="simulated">
      <h1>Points and membership</h1>
      <div className="grid">
        <div className="card">
          <span className="small muted">Your points</span>
          <span className="display">{fmtPoints(user.points)}</span>
          <span className="small muted">{fmtPoints(user.lifetime)} earned in total. Shown as a badge on your contributions, to members only.</span>
        </div>
        <div className="card">
          <span className="small muted">Estimated year-end surplus share</span>
          <span className="display">${share.toFixed(2)}</span>
          <span className="small muted">Estimate in USD from a placeholder surplus of ${cfg.surplusPoolPlaceholder.toLocaleString()}. Based on all points you earned this year; points you spent still count.</span>
        </div>
        <div className="card">
          <span className="small muted">Co-op</span>
          <span className="display">1 vote</span>
          <span className="small muted">Every account is a member with one vote.</span>
          <Link to="/co-op">See co-op decisions</Link>
        </div>
      </div>

      <section className="card">
        <div className="row between">
          <h2>Paid tier</h2>
          {user.paid ? <Badge kind="solid">On this month</Badge> : <Badge kind="dashed">Free account</Badge>}
        </div>
        {user.paid ? (
          <>
            <h3>{user.freeModelsLeft} of {cfg.paidFreeModels} free model downloads left this month</h3>
            <p className="small muted">Unused downloads don’t roll over. After {cfg.paidFreeModels}, models cost {cfg.priceLabel} or {cfg.modelPointsCost} points each. You can also request to host contests.</p>
            <div className="row"><Button to="/contest/request">Request to host a contest</Button><Button to="/browse">Find a measured model</Button></div>
          </>
        ) : (
          <>
            <p className="prose">Billed monthly. {cfg.paidFreeModels} free measured-model downloads a month (no rollover) and the ability to request to host contests. Pay with money or points.</p>
            <div><Button variant="primary" onClick={() => setUp(true)}>Upgrade</Button></div>
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
                <tr><td>Like, comment or vote</td><td className="num">0.25</td><td className="num">0.125</td></tr>
                <tr><td>Photo (after qualification)</td><td className="num">0.5</td><td className="num">0.25</td></tr>
                <tr><td>Scan (after qualification)</td><td className="num">1</td><td className="num">0.5</td></tr>
                <tr><td>Spatial diagram</td><td className="num">2</td><td className="num">2</td></tr>
                <tr><td>Redesign</td><td className="num">5</td><td className="num">5</td></tr>
                <tr><td>Moderator review</td><td className="num">2</td><td className="num">2</td></tr>
              </tbody>
            </table>
          </div>
          <p className="small muted">Off site also covers a declined location prompt and photos without a geotag.</p>
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
          <p>Monthly. Cancel any time.</p>
          <Choice name="up" checked={method === 'card'} onChange={() => setMethod('card')} title={`${cfg.priceLabel} a month by card`}>Simulated. No payment is taken.</Choice>
          <Choice name="up" checked={method === 'points'} onChange={() => setMethod('points')} disabled={!canPoints} title={`${cfg.paidTierPointsCost} points a month (placeholder rate)`}>
            {canPoints ? `You have ${fmtPoints(user.points)} points.` : `Not enough points: you have ${fmtPoints(user.points)}.`}
          </Choice>
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

export function Profile() {
  const { state, user, isArchitect, rankOf } = useDemo();
  if (!user) return <Page narrow tag="simulated"><RoleGate title="Sign in to see your profile">Visitors have no profile.</RoleGate></Page>;
  const touched = (s) => s.uploadedBy === user.id || s.photos.some((p) => p.credit === user.id);
  const mine = state.spaces.filter((s) => touched(s) && !s.removed);
  const removed = state.spaces.filter((s) => touched(s) && s.removed);
  return (
    <Page tag="simulated">
      <header className="stack-sm">
        <div className="row"><Badge>{isArchitect ? 'Architect' : user.paid ? 'Paid account' : 'Community member'}</Badge>{user.verified && <Badge kind="solid">Verified</Badge>}</div>
        <h1>{user.name}</h1>
        <p className="muted small">{fmtPoints(user.points)} points{isArchitect && `, rank ${rankOf(user.id)}`}. {user.licence || ''}</p>
        <div className="row">
          <Button to="/points">Points and membership</Button>
          {isArchitect && <Button to="/portfolio">Portfolio</Button>}
          <Button to="/purchases">My purchases</Button>
        </div>
      </header>
      <section className="stack">
        <h2>Spaces you contributed to ({mine.length})</h2>
        <ul className="list">
          {mine.map((s) => (
            <li key={s.id} className="row between">
              <Link to={`/space/${s.id}`}>{s.name}</Link>
              <span className="row"><StatusBadges space={s} />{s.status === 'pending' && s.uploadedBy === user.id && <span className="small muted">Pending qualification</span>}</span>
            </li>
          ))}
          {mine.length === 0 && <li className="muted">None yet. <Link to="/space/new">Create a space</Link></li>}
        </ul>
      </section>
      <section className="stack">
        <h2>Removed spaces ({removed.length})</h2>
        <p className="small muted">Spaces taken off the platform at an owner’s request. Only contributors see them here, and you keep your photos.</p>
        <ul className="list">
          {removed.map((s) => <li key={s.id}>{s.name} <span className="small muted">({s.photos.filter((p) => p.credit === user.id).length} of your photos kept)</span></li>)}
          {removed.length === 0 && <li className="muted">None.</li>}
        </ul>
      </section>
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
          <Input label="Anything the team should know (optional)" textarea value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} />
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
          <p>The space is hidden from the platform. People who contributed to it can still find their own work under Profile, Removed spaces.</p>
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
