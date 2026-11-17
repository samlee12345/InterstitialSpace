import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Badge, Button, Empty, ImageBox, Input, Page, RoleGate, StatusBadges, Tally } from '../components/ui.jsx';
import { Crumbs } from '../components/domain.jsx';

function Gate() {
  return (
    <Page narrow tag="simulated">
      <RoleGate title="Moderators only">Verified architects (50 points or more) review whether uploads qualify as interstitial spaces.</RoleGate>
    </Page>
  );
}

function StatusCard() {
  const { user, cfg } = useDemo();
  return (
    <aside className="card">
      <div className="row"><Badge kind="solid">Verified moderator</Badge></div>
      <h3>{user.reviewsThisYear} of {cfg.reviewsRequired} reviews this year</h3>
      <Tally yes={Math.min(user.reviewsThisYear, cfg.reviewsRequired)} no={0} total={cfg.reviewsRequired} />
      <p className="small muted">Review {cfg.reviewsRequired} spaces a year to keep the badge. Fall short and you lose it, then wait 3 months before your points are looked at again. Each review earns 2 points.</p>
    </aside>
  );
}

export function Moderation() {
  const { state, user, isModerator, get } = useDemo();
  if (!isModerator) return <Gate />;
  const rows = state.moderation
    .map((m) => ({ ...m, space: get.space(m.spaceId) }))
    .filter((m) => m.space && !m.space.removed && m.space.status === 'pending' && m.space.readyForApproval && m.space.uploadedBy !== user.id);
  const ownHidden = state.spaces.filter((s) => s.status === 'pending' && s.readyForApproval && s.uploadedBy === user.id).length;
  const notReady = state.spaces.filter((s) => !s.removed && s.status === 'pending' && !s.readyForApproval).length;
  return (
    <Page tag="simulated">
      <div className="split">
        <div className="stack">
          <h1>Moderation list</h1>
          <p className="prose muted">Only spaces that are ready for approval are listed: they have a spatial diagram and enough photos. Pick any space to review. Nothing is assigned. You only confirm that an upload is an interstitial space; community votes decide which spaces get attention.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Space</th><th>Photos</th><th>Diagram</th><th>Votes so far</th><th /></tr></thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.spaceId}>
                    <td><span className="bold">{m.space.name}</span><br /><span className="row"><StatusBadges space={m.space} /></span></td>
                    <td>{m.space.photos.length}</td>
                    <td>{m.space.diagram ? (m.space.diagram.source === 'ai' ? 'AI' : 'Architect') : 'None yet'}</td>
                    <td><Tally yes={m.yes} no={m.no} /></td>
                    <td><Button to={`/moderation/${m.spaceId}`}>{m.voted.includes(user.id) ? 'View' : 'Review'}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && <p className="note">Nothing is ready for review right now.</p>}
          {notReady > 0 && <p className="small muted">{notReady} pending space{notReady > 1 ? 's are' : ' is'} not listed yet because {notReady > 1 ? 'they need' : 'it needs'} a spatial diagram or more photos.</p>}
          {ownHidden > 0 && <p className="small muted">{ownHidden} of your own upload{ownHidden > 1 ? 's are' : ' is'} hidden from this list. You can’t review your own uploads.</p>}
          <div><Button to="/flags">Open the flag queue</Button></div>
        </div>
        <StatusCard />
      </div>
    </Page>
  );
}

export function ModerationReview() {
  const { id } = useParams();
  const { state, dispatch, user, isModerator, get, cfg } = useDemo();
  const [no, setNo] = useState(false);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  if (!isModerator) return <Gate />;
  const space = get.space(id);
  const m = state.moderation.find((x) => x.spaceId === id);
  if (!space || !m) return <Page narrow><Empty title="Nothing to review"><div><Button to="/moderation">Back to the list</Button></div></Empty></Page>;
  if (space.uploadedBy === user.id) return <Page narrow tag="simulated"><Empty title="You can’t review your own upload"><div><Button to="/moderation">Back to the list</Button></div></Empty></Page>;
  const voted = m.voted.includes(user.id);
  const decided = space.status !== 'pending';
  const hasDiagram = !!space.diagram;

  const reject = () => {
    if (reason.trim().length < 10) return setErr('Give a reason. It is shown publicly and sent to the contributor.');
    setErr('');
    return dispatch({ type: 'MOD_VOTE', spaceId: id, userId: user.id, yes: false, reason: reason.trim() });
  };

  return (
    <Page tag="simulated">
      <Crumbs items={[['/moderation', 'Moderation list'], [null, space.name]]} />
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
            <h3>Has a spatial diagram?</h3>
            {hasDiagram ? (
              <p className="small">Yes: {space.diagram.source === 'ai' ? 'AI diagram from 10+ photos' : `uploaded by ${get.user(space.diagram.by)?.name}, with ${space.photos.length} photos`}. This space can be voted on.</p>
            ) : (
              <p className="small bold">Not yet. A space needs an AI diagram (10+ photos) or an architect’s diagram plus 5+ photos before the vote opens. It stays pending.</p>
            )}
          </section>
        </div>

        <aside className="stack">
          <div className="card">
            <h3>Does it qualify as an interstitial space?</h3>
            <Tally yes={m.yes} no={m.no} />
            <p className="small muted">5 moderators vote. 3 or more yes approves it. There is no deadline.</p>
            {decided ? (
              <p className="bold">{space.status === 'approved' ? 'Approved: 3 yes votes reached.' : 'Did not qualify: 3 no votes reached.'}</p>
            ) : voted ? (
              <p className="bold">You voted. +2 points.</p>
            ) : !hasDiagram ? (
              <p className="small">Voting opens once the space has a diagram.</p>
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
