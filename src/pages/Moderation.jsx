import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Badge, Button, Empty, ImageBox, Input, Page, RoleGate, Select, StatusBadges, Tally } from '../components/ui.jsx';
import { POINTS } from '../lib/points.js';
import { Crumbs } from '../components/domain.jsx';

function Gate() {
  return (
    <Page narrow tag="simulated">
      <RoleGate title="Architects only">Architects approve new spaces: each confirms that an upload is an interstitial space.</RoleGate>
    </Page>
  );
}

const QUOTA = 10; // approvals per architect every 6 months

function StatusCard() {
  const { user, isModerator } = useDemo();
  const done = Math.min(user.reviewsThisYear || 0, QUOTA);
  return (
    <aside className="card">
      <div className="row"><Badge kind="solid">{isModerator ? 'Moderator' : 'Architect'}</Badge></div>
      <h3>{done} of {QUOTA} approvals in the last 6 months</h3>
      <Tally yes={done} no={0} total={QUOTA} />
      <p className="small muted">Review {QUOTA} spaces every 6 months to keep your architect status. Each review earns {POINTS.review} points.</p>
    </aside>
  );
}

const emptyRow = (spaceId) => ({ spaceId, yes: 0, no: 0, voted: [], duplicates: [], mergeVotes: 0 });

// Reported updates wait here for a moderator.
function UpdateReports() {
  const { state, dispatch, get } = useDemo();
  const pending = state.updateReports.filter((r) => r.status === 'pending');
  return (
    <section className="stack" aria-labelledby="updates-h">
      <h2 id="updates-h" className="h-sm">Reported updates ({pending.length})</h2>
      <p className="small muted">Someone says the space changed on the ground. Check the proof. Confirming moves all past contributions to the space’s Archived tab.</p>
      {pending.length === 0 && <p className="note">No reported updates waiting.</p>}
      <ul className="list">
        {pending.map((r) => {
          const sp = get.space(r.spaceId);
          return (
            <li key={r.id} className="stack-sm">
              <div className="row"><Link className="bold" to={`/space/${r.spaceId}`}>{sp?.name}</Link><span className="small muted">reported by {get.user(r.by)?.name} on {r.date}</span></div>
              <p>{r.text}</p>
              <div className="thumbs">{Array.from({ length: r.photos }, (_, i) => <ImageBox key={i} label={`Proof ${i + 1}`} shape="square" />)}</div>
              <div className="row">
                <Button variant="primary" onClick={() => dispatch({ type: 'RESOLVE_UPDATE', id: r.id, ok: true })}>Confirm update and archive</Button>
                <Button onClick={() => dispatch({ type: 'RESOLVE_UPDATE', id: r.id, ok: false })}>Not an update</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Moderation() {
  const { state, user, isModerator, isArchitect } = useDemo();
  const [city, setCity] = useState('all');
  if (!isModerator && !isArchitect) return <Gate />;
  // Every pending space is listed as soon as it is created; no diagram needed.
  const pending = state.spaces.filter((s) => !s.removed && s.status === 'pending');
  const cities = [...new Set(pending.map((s) => s.city || 'Jaipur'))].sort();
  const rows = pending
    .filter((s) => s.uploadedBy !== user.id && (city === 'all' || (s.city || 'Jaipur') === city))
    .map((space) => ({ ...(state.moderation.find((m) => m.spaceId === space.id) || emptyRow(space.id)), space }));
  const own = pending.filter((s) => s.uploadedBy === user.id).length;
  return (
    <Page tag="simulated">
      <div className="split">
        <div className="stack">
          <h1>Spaces to approve</h1>
          <p className="prose muted">Every new space waits here until architects confirm it is an interstitial space. Pick any. Nothing is assigned. Three yes votes approve a space; community votes then decide which spaces get redesigned.</p>
          <Select label="City" value={city} onChange={(e) => setCity(e.target.value)} options={[{ value: 'all', label: 'All cities' }, ...cities.map((c) => ({ value: c, label: c }))]} />
          <div className="table-wrap">
            <table>
              <thead><tr><th>Space</th><th>City</th><th>Photos</th><th>Diagrams</th><th>Votes so far</th><th /></tr></thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.spaceId}>
                    <td><span className="bold">{m.space.name}</span><br /><span className="small muted">Added {m.space.addedAt}</span></td>
                    <td>{m.space.city || 'Jaipur'}</td>
                    <td>{m.space.photos.length}</td>
                    <td>{m.space.diagrams.length || 'None yet'}</td>
                    <td><Tally yes={m.yes} no={m.no} /></td>
                    <td><Button to={`/moderation/${m.spaceId}`}>{m.voted.includes(user.id) ? 'View' : 'Review'}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && <p className="note">Nothing waiting{city !== 'all' ? ` in ${city}` : ''}.</p>}
          {own > 0 && <p className="small muted">{own} of your own upload{own > 1 ? 's are' : ' is'} hidden from this list. You can’t review your own uploads.</p>}
          {isModerator && <><hr className="rule" /><UpdateReports /><div><Button to="/flags">Open the flag queue</Button></div></>}
        </div>
        <StatusCard />
      </div>
    </Page>
  );
}

export function ModerationReview() {
  const { id } = useParams();
  const { state, dispatch, user, isModerator, isArchitect, get, cfg } = useDemo();
  const [no, setNo] = useState(false);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  if (!isModerator && !isArchitect) return <Gate />;
  const space = get.space(id);
  const m = space && (state.moderation.find((x) => x.spaceId === id) || emptyRow(id));
  if (!space || !m) return <Page narrow><Empty title="Nothing to review"><div><Button to="/moderation">Back to the list</Button></div></Empty></Page>;
  if (space.uploadedBy === user.id) return <Page narrow tag="simulated"><Empty title="You can’t review your own upload"><div><Button to="/moderation">Back to the list</Button></div></Empty></Page>;
  const voted = m.voted.includes(user.id);
  const decided = space.status !== 'pending';

  const reject = () => {
    if (reason.trim().length < 10) return setErr('Give a reason. It is shown publicly and sent to the contributor.');
    setErr('');
    return dispatch({ type: 'MOD_VOTE', spaceId: id, userId: user.id, yes: false, reason: reason.trim() });
  };

  return (
    <Page tag="simulated">
      <Crumbs items={[['/moderation', 'Spaces to approve'], [null, space.name]]} />
      <div className="split">
        <div className="stack">
          <div className="row"><StatusBadges space={space} />{space.status === 'approved' && <Badge kind="solid">Approved</Badge>}</div>
          <h1>{space.name}</h1>
          <p className="small muted">Uploaded by {get.user(space.uploadedBy)?.name}. <Link to={`/space/${space.id}`}>Open the public page</Link></p>
          <div className="grid">{space.photos.slice(0, 6).map((p, i) => <ImageBox key={p.id} label={`Photo ${i + 1}`} />)}</div>
          <div className="card">
            <h3>Questionnaire</h3>
            <dl className="dl">
              <dt>Feelings</dt><dd>{space.questionnaire.feelings}</dd>
              <dt>Transition</dt><dd>{space.questionnaire.transition}</dd>
              <dt>Materiality</dt><dd>{space.questionnaire.materiality}</dd>
              <dt>Sensory</dt><dd>{space.questionnaire.sensory}</dd>
            </dl>
          </div>

          <section className="card">
            <h3>Same place?</h3>
            {m.duplicates.length === 0 ? (
              <p className="small muted">No other entries within {cfg.duplicateRadiusM} m.</p>
            ) : (
              <>
                <p className="small">Possible duplicate within {cfg.duplicateRadiusM} m:</p>
                {m.duplicates.map((d) => (
                  <div key={d} className="row between">
                    <Link to={`/space/${d}`}>{get.space(d)?.name}</Link>
                    <Button disabled={m.mergeVoted || m.mergeVotes >= 3} onClick={() => dispatch({ type: 'MOD_MERGE_VOTE', spaceId: id })}>Mark as the same place</Button>
                  </div>
                ))}
                <Tally yes={m.mergeVotes} no={0} />
                <p className="small muted">A merge needs 3 of 5 moderators. {m.mergeVotes >= 3 ? 'Reached: the entries will be merged and the contributor notified.' : ''}</p>
              </>
            )}
          </section>

          <section className="card">
            <h3>Documentation so far</h3>
            <p className="small">{space.photos.length} photos, {space.diagrams.length} spatial diagram{space.diagrams.length === 1 ? '' : 's'}. You can approve a space before it has a diagram.</p>
          </section>
        </div>

        <aside className="stack">
          <div className="card">
            <h3>Does it qualify as an interstitial space?</h3>
            <Tally yes={m.yes} no={m.no} />
            <p className="small muted">Architects vote. 3 yes votes approve it; 3 no votes reject it. There is no deadline.</p>
            {decided ? (
              <p className="bold">{space.status === 'approved' ? 'Approved: 3 yes votes reached.' : 'Did not qualify: 3 no votes reached.'}</p>
            ) : voted ? (
              <p className="bold">You voted. +{POINTS.review} points.</p>
            ) : no ? (
              <>
                <Input label="Reason (public)" textarea value={reason} onChange={(e) => setReason(e.target.value)} error={err} hint="Anyone can read this. The contributor can appeal or resubmit." />
                <div className="row"><Button variant="primary" onClick={reject}>Submit “does not qualify”</Button><Button onClick={() => setNo(false)}>Cancel</Button></div>
              </>
            ) : (
              <div className="row">
                <Button variant="primary" onClick={() => dispatch({ type: 'MOD_VOTE', spaceId: id, userId: user.id, yes: true })}>Yes, it qualifies</Button>
                <Button onClick={() => setNo(true)}>No, it doesn’t</Button>
              </div>
            )}
          </div>
          <Button to="/moderation">Back to the list</Button>
        </aside>
      </div>
    </Page>
  );
}

export function Flags() {
  const { state, dispatch, isModerator, get } = useDemo();
  const [open, setOpen] = useState(null);
  if (!isModerator) return <Gate />;
  return (
    <Page tag="simulated">
      <h1>Flag queue</h1>
      <p className="prose muted">Members report live redesigns and diagrams that look incorrect. Verify the report, then take the listing down or keep it.</p>
      <ul className="list">
        {state.flags.map((f) => {
          const item = get.redesign(f.itemId) || get.model(f.itemId);
          return (
            <li key={f.id} className="stack-sm">
              <div className="row"><Badge kind={f.status === 'open' ? 'solid' : ''}>{f.status === 'open' ? 'Open' : f.status}</Badge><Link className="bold" to={`/item/${f.itemId}`}>{item?.title}</Link></div>
              <p>Report: {f.reason}</p>
              {f.status === 'open' && open !== f.id && <div><Button onClick={() => setOpen(f.id)}>Verify report</Button></div>}
              {f.status === 'open' && open === f.id && (
                <div className="card sunken">
                  <div className="halves"><ImageBox label="Listing file" /><ImageBox label="Measured diagram" /></div>
                  <p className="small">Compare the listing with the space’s measured diagram, then decide.</p>
                  <div className="row">
                    <Button variant="primary" onClick={() => dispatch({ type: 'FLAG_RESOLVE', id: f.id, takeDown: true })}>Report is correct: take down</Button>
                    <Button onClick={() => dispatch({ type: 'FLAG_RESOLVE', id: f.id, takeDown: false })}>Report is wrong: keep listing</Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Page>
  );
}
