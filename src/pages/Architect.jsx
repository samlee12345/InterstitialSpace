import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Badge, Button, Empty, FileDrop, ImageBox, Input, Modal, Page, PointsBadge, RoleGate } from '../components/ui.jsx';
import { RedesignCard } from '../components/domain.jsx';
import { fmtPoints } from '../lib/points.js';

function EditModal({ redesign, onClose }) {
  const { dispatch } = useDemo();
  const [f, setF] = useState({ title: redesign.title, description: redesign.description, files: redesign.files });
  const [err, setErr] = useState('');
  const save = () => {
    if (!f.title.trim() || !f.description.trim() || f.files.length === 0) return setErr('Title, description and at least one file are needed.');
    dispatch({ type: 'EDIT_REDESIGN', id: redesign.id, patch: { title: f.title.trim(), description: f.description.trim(), files: f.files } });
    return onClose();
  };
  return (
    <Modal title="Edit redesign" onClose={onClose}>
      <Input label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <Input label="Description" textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <FileDrop label="Files" files={f.files} onChange={(files) => setF({ ...f, files })} samples={['drawings-revised.pdf']} />
      <p className="small muted">Saving creates version {redesign.version + 1}. The price stays the same. People who already bought it can update to the new version.</p>
      {err && <span className="error" role="alert">{err}</span>}
      <div className="row">
        <Button variant="primary" onClick={save}>Save changes</Button>
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  );
}

export function Portfolio() {
  const { state, dispatch, user, isArchitect, get, cfg, rankOf } = useDemo();
  const [edit, setEdit] = useState(null);
  const [unpub, setUnpub] = useState(null);
  if (!isArchitect) return <Page narrow tag="clickable"><RoleGate title="Portfolios are for architects">Switch to the Architect role to manage redesigns.</RoleGate></Page>;

  const mine = state.redesigns.filter((r) => r.architectId === user.id);
  const live = mine.filter((r) => r.published && !r.takenDown);
  const hidden = mine.filter((r) => !r.published || r.takenDown);
  const diagrams = state.diagramUploads.filter((d) => d.userId === user.id);
  const entries = state.contests.flatMap((c) => c.entries.filter((e) => e.architectId === user.id).map((e) => ({ ...e, contest: c })));

  const row = (r) => (
    <li key={r.id} className="row row-top">
      <div className="thumb"><ImageBox label="Redesign preview" /></div>
      <div className="stack-sm grow">
        <div className="row">
          <Badge>Version {r.version}</Badge>
          {r.takenDown ? <Badge kind="dashed">Taken down by a moderator</Badge> : r.published ? <Badge kind="solid">Published</Badge> : <Badge kind="dashed">Unpublished</Badge>}
        </div>
        <Link className="bold" to={`/item/${r.id}`}>{r.title}</Link>
        <span className="small">{r.description}</span>
        <span className="small muted">
          For <Link to={`/space/${r.spaceId}?tab=redesigns`}>{get.space(r.spaceId)?.name}</Link>. {r.sales} sale{r.sales === 1 ? '' : 's'} at {cfg.priceLabel}. Files: {r.files.join(', ')}
        </span>
        {!r.takenDown && (
          <div className="row">
            <Button onClick={() => setEdit(r)}>Edit</Button>
            {r.published ? <Button onClick={() => setUnpub(r)}>Unpublish</Button> : <Button onClick={() => dispatch({ type: 'SET_PUBLISHED', id: r.id, on: true })}>Publish again</Button>}
          </div>
        )}
      </div>
    </li>
  );

  return (
    <Page tag="clickable">
      <div className="row between">
        <div className="stack-sm">
          <h1>Your portfolio</h1>
          <p className="muted small">Rank {rankOf(user.id)} of {state.users.filter((u) => u.role === 'architect').length} architects, {fmtPoints(user.points)} points.</p>
        </div>
        <div className="row">
          <Button to={`/architect/${user.id}`}>View public page</Button>
          <Button to="/earnings">Earnings</Button>
        </div>
      </div>
      <p className="note">To add a redesign, open a space and choose “Upload redesign”. <Link to="/browse">Browse spaces</Link></p>

      <section className="stack">
        <h2>Published redesigns ({live.length})</h2>
        {live.length === 0 ? <Empty title="Nothing published"><p>Open a space to upload your first redesign.</p></Empty> : <ul className="list">{live.map(row)}</ul>}
      </section>
      {hidden.length > 0 && (
        <section className="stack">
          <h2>Unpublished ({hidden.length})</h2>
          <p className="small muted">Only you can see these. They are hidden from your public page, the ranking and space pages. Buyers keep their copy.</p>
          <ul className="list">{hidden.map(row)}</ul>
        </section>
      )}
      <section className="stack">
        <h2>Spatial diagrams you uploaded ({diagrams.length})</h2>
        {diagrams.length === 0 ? <p className="muted small">None yet. Open a pending space without a diagram to add one.</p> : (
          <ul className="list">{diagrams.map((d) => <li key={d.id}><Link to={`/space/${d.spaceId}?tab=diagram`}>{get.space(d.spaceId)?.name}</Link> <span className="small muted">added {d.date}, +2 points</span></li>)}</ul>
        )}
      </section>
      <section className="stack">
        <h2>Contest entries ({entries.length})</h2>
        {entries.length === 0 ? <p className="muted small">None yet. <Link to="/contests">Browse contests</Link></p> : (
          <ul className="list">{entries.map((e) => <li key={e.id}><span className="bold">{e.title}</span> <span className="small muted">in <Link to={`/contest/${e.contest.id}`}>{e.contest.title}</Link></span></li>)}</ul>
        )}
      </section>

      {edit && <EditModal redesign={edit} onClose={() => setEdit(null)} />}
      {unpub && (
        <Modal title="Unpublish this redesign?" onClose={() => setUnpub(null)}>
          <p>“{unpub.title}” will be hidden from your public page, the ranking and the space page. Nobody new can buy it.</p>
          <p>The {unpub.sales} buyer{unpub.sales === 1 ? '' : 's'} so far keep their copy. You can publish it again later.</p>
          <div className="row">
            <Button
              variant="primary"
              onClick={() => {
                dispatch({ type: 'SET_PUBLISHED', id: unpub.id, on: false });
                setUnpub(null);
              }}
            >
              Unpublish
            </Button>
            <Button onClick={() => setUnpub(null)}>Keep published</Button>
          </div>
        </Modal>
      )}
    </Page>
  );
}

export function ArchitectPage() {
  const { id } = useParams();
  const { state, get, isMember, rankOf, dispatch } = useDemo();
  const a = get.user(id);
  if (!a || a.role !== 'architect') return <Page narrow><Empty title="Architect not found"><div><Button to="/ranking">See the ranking</Button></div></Empty></Page>;
  const list = state.redesigns.filter((r) => r.architectId === id && r.published && !r.takenDown);
  return (
    <Page tag="clickable">
      <header className="stack-sm">
        <div className="row"><Badge>Rank {rankOf(id)}</Badge><PointsBadge userId={id} /></div>
        <h1>{a.name}</h1>
        <p className="muted small">{a.licence}. {list.length} published redesign{list.length === 1 ? '' : 's'}.</p>
      </header>
      {list.length === 0 && <Empty title="No published redesigns"><p>This architect has nothing for sale right now.</p></Empty>}
      {isMember ? (
        <div className="grid">{list.map((r) => <RedesignCard key={r.id} redesign={r} />)}</div>
      ) : list.length > 0 && (
        <div className="teaser">
          <div className="grid">{list.map((r) => <RedesignCard key={r.id} redesign={r} blurred />)}</div>
          <div className="teaser-cta"><div>
            <h3>Redesigns are visible to members</h3>
            <Button variant="primary" onClick={() => dispatch({ type: 'OPEN_SIGNUP', reason: 'redesigns' })}>See redesigns</Button>
          </div></div>
        </div>
      )}
    </Page>
  );
}

export function Ranking() {
  const { state, architects, isMember, user } = useDemo();
  return (
    <Page tag="clickable">
      <header className="stack-sm">
        <h1>Architect ranking</h1>
        <p className="prose muted">Only architects are ranked. Rank counts redesigns, spatial diagrams, documented spaces and moderator reviews. A higher rank puts an architect’s redesigns higher on space pages.</p>
      </header>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Rank</th><th>Architect</th><th className="num">Published redesigns</th><th className="num">Reviews this year</th>{isMember && <th className="num">Points</th>}</tr></thead>
          <tbody>
            {architects.map((a, i) => (
              <tr key={a.id} className={a.id === user?.id ? 'unread' : ''}>
                <td>{i + 1}</td>
                <td><Link to={`/architect/${a.id}`}>{a.name}</Link> {isMember && a.verified && <Badge kind="solid">Verified</Badge>}</td>
                <td className="num">{state.redesigns.filter((r) => r.architectId === a.id && r.published && !r.takenDown).length}</td>
                <td className="num">{a.reviewsThisYear || 0}</td>
                {isMember && <td className="num">{fmtPoints(a.points)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isMember && <p className="small muted">Points and badges are shown to signed-in members.</p>}
    </Page>
  );
}

export function Earnings() {
  const { state, dispatch, user, isArchitect, cfg, get } = useDemo();
  const [confirm, setConfirm] = useState(false);
  if (!isArchitect) return <Page narrow tag="clickable"><RoleGate title="Earnings are for architects">Architects earn 80% of each redesign sale.</RoleGate></Page>;
  const mine = state.redesigns.filter((r) => r.architectId === user.id);
  const share = (n) => n * cfg.priceValue * cfg.architectShare;
  const total = share(mine.reduce((t, r) => t + r.sales, 0));
  const balance = Math.max(total - (user.paidOut || 0), 0);
  const money = (n) => `$${n.toFixed(2)}`;
  const payouts = state.payouts.filter((p) => p.userId === user.id);
  return (
    <Page tag="clickable">
      <header className="stack-sm">
        <h1>Earnings and payout</h1>
        <p className="note">Prices are not decided yet, so every sale shows as {cfg.priceLabel}. The dollar figures below use a placeholder of ${cfg.priceValue} per sale so the 80% share can be checked.</p>
      </header>
      <div className="grid">
        <div className="card"><span className="small muted">Available to pay out</span><span className="display">{money(balance)}</span><span className="xs muted">placeholder amount</span></div>
        <div className="card"><span className="small muted">Earned so far (80% share)</span><span className="display">{money(total)}</span><span className="xs muted">placeholder amount</span></div>
        <div className="card"><span className="small muted">Already paid out</span><span className="display">{money(user.paidOut || 0)}</span><span className="xs muted">placeholder amount</span></div>
      </div>
      <div><Button variant="primary" disabled={balance <= 0} onClick={() => setConfirm(true)}>Request payout</Button>{balance <= 0 && <span className="small muted"> Nothing to pay out yet.</span>}</div>

      <section className="stack">
        <h2>Sales by redesign</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Redesign</th><th>Space</th><th className="num">Sales</th><th className="num">Gross</th><th className="num">Platform 20%</th><th className="num">You 80%</th></tr></thead>
            <tbody>
              {mine.map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/item/${r.id}`}>{r.title}</Link>{!r.published && <> <Badge kind="dashed">Unpublished</Badge></>}</td>
                  <td>{get.space(r.spaceId)?.name}</td>
                  <td className="num">{r.sales}</td>
                  <td className="num">{cfg.priceLabel} × {r.sales}</td>
                  <td className="num">{money(r.sales * cfg.priceValue * (1 - cfg.architectShare))}</td>
                  <td className="num">{money(share(r.sales))}</td>
                </tr>
              ))}
              {mine.length === 0 && <tr><td colSpan={6} className="muted">No redesigns yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="stack">
        <h2>Payout history</h2>
        {payouts.length === 0 ? <p className="muted small">No payouts yet.</p> : (
          <ul className="list">{payouts.map((p) => <li key={p.id} className="row between"><span>{p.date}</span><span>{money(p.amount)} to bank account ending 0000 (placeholder)</span></li>)}</ul>
        )}
      </section>
      {confirm && (
        <Modal title="Request payout" onClose={() => setConfirm(false)}>
          <p>Send {money(balance)} to the bank account ending 0000 (placeholder)?</p>
          <div className="row">
            <Button
              variant="primary"
              onClick={() => {
                dispatch({ type: 'REQUEST_PAYOUT', userId: user.id, amount: balance });
                setConfirm(false);
              }}
            >
              Request payout
            </Button>
            <Button onClick={() => setConfirm(false)}>Cancel</Button>
          </div>
        </Modal>
      )}
    </Page>
  );
}

const TYPE_LABEL = { sale: 'Sales', contest: 'Contest results', points: 'Points', ranking: 'Ranking', coop: 'Co-op decisions', removal: 'Removal status' };

export function Notifications() {
  const { state, dispatch, user } = useDemo();
  const [filter, setFilter] = useState('all');
  if (!user) return <Page narrow tag="clickable"><RoleGate title="Sign in to see notifications">Visitors have no notifications.</RoleGate></Page>;
  const mine = state.notifications.filter((n) => n.to === user.id);
  const shown = mine.filter((n) => filter === 'all' || n.type === filter);
  return (
    <Page narrow tag="clickable">
      <div className="row between">
        <h1>Notifications</h1>
        <Button onClick={() => dispatch({ type: 'READ_ALL', userId: user.id })} disabled={!mine.some((n) => !n.read)}>Mark all as read</Button>
      </div>
      <div className="row">
        <Button variant={filter === 'all' ? 'primary' : 'default'} onClick={() => setFilter('all')}>All</Button>
        {Object.entries(TYPE_LABEL).map(([k, v]) => (
          <Button key={k} variant={filter === k ? 'primary' : 'default'} onClick={() => setFilter(k)}>{v}</Button>
        ))}
      </div>
      {shown.length === 0 ? <Empty title="Nothing here"><p>Notifications of this kind will show up as you use the platform.</p></Empty> : (
        <ul className="list">
          {shown.map((n) => (
            <li key={n.id} className={n.read ? '' : 'unread'}>
              <Link className="plain-link stack-sm" to={n.link || '/notifications'} onClick={() => dispatch({ type: 'READ_ONE', id: n.id })}>
                <span className="row"><Badge>{TYPE_LABEL[n.type]}</Badge>{!n.read && <span className="xs">New</span>}</span>
                <span>{n.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
