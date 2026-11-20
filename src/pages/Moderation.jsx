import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Badge, Button, Choice, Empty, FormActions, ImageBox, Input, Page, RoleGate, Select, StatusBadges, Tally } from '../components/ui.jsx';
import { overlapping } from '../lib/geo.js';
import { POINTS } from '../lib/points.js';
import { AreaMap, Crumbs, UserLink } from '../components/domain.jsx';

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

const emptyRow = (spaceId) => ({ spaceId, yes: 0, no: 0, voted: [], votes: {}, notes: [], duplicates: [], mergeVotes: 0 });
// Totals: earlier anonymous votes plus each reviewer's current vote.
export const tally = (m) => {
  const v = Object.values(m.votes || {});
  return { yes: m.yes + v.filter((x) => x.vote === 'yes').length, no: m.no + v.filter((x) => x.vote === 'no').length };
};
const myVote = (m, userId) => (m.votes || {})[userId] || (m.voted.includes(userId) ? { vote: 'yes' } : null);
export const reviewRow = (state, spaceId) => state.moderation.find((x) => x.spaceId === spaceId) || emptyRow(spaceId);

// What a reviewer checks before voting yes.
export const CRITERIA = [
  'It sits between other places: a threshold, edge, step or leftover space',
  'People use it: the photos or experiences show it in use',
  'It is open to the public',
  'The location and the drawn area match the photos',
  'It isn’t already on the platform: no overlapping space is the same place',
];

// The vote: used on the review page and in the "Moderate" popup on a space page.
export function ReviewForm({ space, onDone }) {
  const { state, dispatch, user, isModerator, visibleSpaces } = useDemo();
  const m = reviewRow(state, space.id);
  const mine = myVote(m, user.id);
  const [editing, setEditing] = useState(!mine);
  const [choice, setChoice] = useState(mine?.vote || null);
  const [checks, setChecks] = useState(mine?.checks || []);
  const [reason, setReason] = useState(mine?.reason || '');
  const [moveTo, setMoveTo] = useState(mine?.moveTo || '');
  const [err, setErr] = useState('');
  const t = tally(m);
  const near = overlapping(space, visibleSpaces);
  const toggle = (c) => setChecks(checks.includes(c) ? checks.filter((x) => x !== c) : [...checks, c]);
  const submit = () => {
    if (choice === 'yes' && checks.length < CRITERIA.length) return setErr('Tick every criterion to approve. If one doesn’t hold, vote no and say why.');
    if (choice === 'no' && reason.trim().length < 10) return setErr('Give a reason. It is shown publicly and sent to the contributor.');
    setErr('');
    dispatch({ type: 'MOD_VOTE', spaceId: space.id, userId: user.id, yes: choice === 'yes', checks, reason: reason.trim(), moveTo: choice === 'no' ? moveTo || null : null });
    setEditing(false);
    return onDone?.();
  };
  const moveNow = () => {
    if (!moveTo) return setErr('Choose the existing space to move the contributions to.');
    if (reason.trim().length < 10) return setErr('Give a reason. It is shown publicly and sent to the contributor.');
    dispatch({ type: 'MOD_MOVE', spaceId: space.id, intoId: moveTo, userId: user.id, reason: reason.trim() });
    return onDone?.();
  };
  if (space.uploadedBy === user.id) return <p className="note small">You created this space, so you can’t review it.</p>;
  return (
    <div className="stack">
      <div className="stack-sm">
        <Tally yes={t.yes} no={t.no} />
        <p className="small muted">3 yes votes approve it; 3 no votes decline it. You can change your vote at any time.</p>
        {space.status !== 'pending' && <p className="bold">{space.status === 'approved' ? 'Approved: 3 yes votes reached.' : space.movedTo ? 'Declined and moved to an existing space.' : 'Declined: 3 no votes reached.'}</p>}
      </div>
      {!editing ? (
        <div className="stack-sm">
          <p className="bold">{mine ? `You voted ${mine.vote === 'yes' ? 'yes, it qualifies' : 'no, it doesn’t qualify'}.` : 'Your vote is recorded.'}</p>
          {mine?.reason && <p className="small">Your reason: {mine.reason}</p>}
          <div><Button onClick={() => setEditing(true)}>Edit your vote</Button></div>
        </div>
      ) : (
        <>
          <fieldset className="stack-sm plain">
            <legend className="bold">Check before you vote</legend>
            {CRITERIA.map((c) => <Choice key={c} type="checkbox" checked={checks.includes(c)} onChange={() => toggle(c)} title={c} />)}
          </fieldset>
          <fieldset className="stack-sm plain">
            <legend className="bold">Does it qualify as an interstitial space?</legend>
            <div className="row">
              <Choice name={`vote-${space.id}`} checked={choice === 'yes'} onChange={() => { setChoice('yes'); setErr(''); }} title="Yes, approve it" />
              <Choice name={`vote-${space.id}`} checked={choice === 'no'} onChange={() => { setChoice('no'); setErr(''); }} title="No, decline it" />
            </div>
          </fieldset>
          {choice === 'no' && (
            <>
              <Input label="Reason (public)" textarea value={reason} onChange={(e) => setReason(e.target.value)} hint="Anyone can read this. The contributor can appeal or resubmit." />
              <Select
                label="Alternative: it’s part of an existing space"
                value={moveTo}
                onChange={(e) => setMoveTo(e.target.value)}
                options={[{ value: '', label: 'No, it isn’t' }, ...near.map(({ s }) => ({ value: s.id, label: s.name })), ...visibleSpaces.filter((s) => s.id !== space.id && s.status === 'approved' && !near.some((n) => n.s.id === s.id)).map((s) => ({ value: s.id, label: s.name }))]}
              />
              {moveTo && <p className="small muted">{isModerator ? 'As a moderator you can decline it now and move its photos, experiences and votes to that space.' : 'Your suggestion is shown to the moderators, who can move the contributions.'}</p>}
            </>
          )}
          {err && <span className="error" role="alert">{err}</span>}
          <FormActions>
            {mine && <Button onClick={() => setEditing(false)}>Cancel</Button>}
            {choice === 'no' && moveTo && isModerator && <Button onClick={moveNow}>Decline and move contributions</Button>}
            <Button variant="primary" disabled={!choice} onClick={submit}>{mine ? 'Update vote' : 'Submit vote'}</Button>
          </FormActions>
        </>
      )}
    </div>
  );
}

// The contest whose winning design for this report's space was marked built (or that an
// older report named), if any.
function builtContestFor(state, r) {
  if (r.contestId) return state.contests.find((c) => c.id === r.contestId);
  return state.contests.find((c) => c.spaceId === r.spaceId && c.built && c.winner);
}

// Round 31: a reported update is reviewed on its own page, like a new space, but one
// moderator's decision is enough (it's a check of the proof, not a vote).
export function UpdateReview() {
  const { id } = useParams();
  const { state, dispatch, get, isModerator } = useDemo();
  const nav = useNavigate();
  const r = state.updateReports.find((x) => x.id === id);
  const [isBuild, setIsBuild] = useState(null);
  const [err, setErr] = useState('');
  if (!isModerator) return <Gate />;
  if (!r) return <Page><p className="note">This report isn’t waiting any more. <Link to="/moderation">Back to Waiting for review</Link></p></Page>;
  const sp = get.space(r.spaceId);
  // Round 32: if a contest's winning design for this space was marked built, the moderator
  // says whether this report is that build (the reporter isn't asked).
  const contest = builtContestFor(state, r);
  const won = contest && contest.entries.find((e) => e.id === contest.winner);
  const decide = (ok) => {
    if (ok && contest && isBuild === null) return setErr('Say whether this is the build of the winning design.');
    dispatch({ type: 'RESOLVE_UPDATE', id: r.id, ok, contestId: ok && contest && isBuild ? contest.id : null });
    return nav(ok ? `/space/${r.spaceId}` : '/moderation');
  };
  return (
    <Page tag="simulated">
      <Crumbs items={[['/moderation', 'Waiting for review'], [null, `Reported update: ${sp?.name}`]]} />
      <div className="stack">
        <h1>Reported update</h1>
        <p><Link className="bold" to={`/space/${r.spaceId}`}>{sp?.name}</Link> <span className="muted">· reported by <UserLink id={r.by} you={false} /> on {r.date}</span></p>
        <section className="stack-sm" aria-labelledby="what-h">
          <h2 id="what-h" className="h-sm">What changed</h2>
          <p className="prose">{r.text}</p>
          {r.photos > 0 && <div className="thumbs">{Array.from({ length: r.photos }, (_, i) => <ImageBox key={i} label={`Proof ${i + 1}`} shape="square" />)}</div>}
        </section>
        <section className="card stack-sm" aria-labelledby="decide-h">
          <h2 id="decide-h" className="h-sm">Your decision</h2>
          <p className="small muted">One moderator decides. Confirming moves every past contribution to the space’s Archived tab and resets its votes.</p>
          {contest && (
            <fieldset className="stack-sm">
              <legend className="bold">Is this the build of “{won?.title}”, the winning design from <Link to={`/contest/${contest.id}`}>{contest.title}</Link>?</legend>
              <p className="small muted">The host marked it built on {contest.built}. If it is, the space is also marked Redesigned and linked to the contest.</p>
              <div className="row">
                <Choice name="is-build" checked={isBuild === true} onChange={() => { setIsBuild(true); setErr(''); }} title="Yes, it’s that build" />
                <Choice name="is-build" checked={isBuild === false} onChange={() => { setIsBuild(false); setErr(''); }} title="No, a different change" />
              </div>
              {err && <span className="error" role="alert">{err}</span>}
            </fieldset>
          )}
          <div className="row">
            <Button variant="primary" onClick={() => decide(true)}>Confirm update and archive</Button>
            <Button onClick={() => decide(false)}>Not an update</Button>
          </div>
        </section>
      </div>
    </Page>
  );
}

export function Moderation() {
  const { state, user, isModerator, isArchitect, get, dispatch } = useDemo();
  const [city, setCity] = useState('all');
  if (!isModerator && !isArchitect) return <Gate />;
  // Every pending space is listed as soon as it is created; no diagram needed.
  const pending = state.spaces.filter((s) => !s.removed && s.status === 'pending');
  const cities = [...new Set(pending.map((s) => s.city || 'Jaipur'))].sort();
  const rows = pending
    .filter((s) => city === 'all' || (s.city || 'Jaipur') === city)
    .map((space) => ({ ...(state.moderation.find((m) => m.spaceId === space.id) || emptyRow(space.id)), space }));
  // Reported updates sit in the same list, for moderators only (round 31).
  const updates = isModerator ? state.updateReports.filter((r) => r.status === 'pending' && (city === 'all' || (get.space(r.spaceId)?.city || 'Jaipur') === city)) : [];
  // Designer credits too (round 32): named by an architect, one moderator confirms.
  const claims = isModerator ? state.designerClaims.filter((c) => c.status === 'pending' && (city === 'all' || (get.space(c.spaceId)?.city || 'Jaipur') === city)) : [];
  return (
    <Page tag="simulated">
      <div className="split">
        <div className="stack">
          <h1>Waiting for review</h1>
          <p className="prose muted">New spaces wait here until architects confirm they are interstitial spaces: pick any, nothing is assigned, and three yes votes approve one. {isModerator ? 'Reported updates and designer credits are here too; one moderator decides those.' : ''}</p>
          <Select label="City" value={city} onChange={(e) => setCity(e.target.value)} options={[{ value: 'all', label: 'All cities' }, ...cities.map((c) => ({ value: c, label: c }))]} />
          <div className="table-wrap">
            <table>
              <thead><tr><th>Space</th><th>Type</th><th>Contributor</th><th>Votes so far</th><th><span className="visually-hidden">Action</span></th></tr></thead>
              <tbody>
                {updates.map((r) => {
                  const sp = get.space(r.spaceId);
                  return (
                    <tr key={r.id}>
                      <td><span className="bold">{sp?.name}</span><br /><span className="small muted">Reported {r.date}</span></td>
                      <td><Badge>Reported update</Badge>{builtContestFor(state, r) && <><br /><span className="small muted">A winning design here was marked built</span></>}</td>
                      <td><UserLink id={r.by} you={false} /></td>
                      <td className="small muted">One moderator decides</td>
                      <td className="nowrap"><Button to={`/moderation/update/${r.id}`}>Review</Button></td>
                    </tr>
                  );
                })}
                {claims.map((c) => (
                  <tr key={c.id}>
                    <td><span className="bold">{get.space(c.spaceId)?.name}</span><br /><span className="small muted">Named {c.date}</span></td>
                    <td><Badge>Designer credit</Badge><br /><span className="small">{c.external ? `${c.external.name} (not on the platform)` : <UserLink id={c.designer} you={false} />} designed it</span>{c.note && <><br /><span className="small muted">{c.note}</span></>}</td>
                    <td><UserLink id={c.by} you={false} /></td>
                    <td className="small muted">One moderator decides</td>
                    <td><div className="stack-sm"><Button onClick={() => dispatch({ type: 'DESIGNER_RESOLVE', id: c.id, ok: true })}>Confirm</Button><Button variant="quiet" onClick={() => dispatch({ type: 'DESIGNER_RESOLVE', id: c.id, ok: false })}>Decline</Button></div></td>
                  </tr>
                ))}
                {rows.map((m) => {
                  const t = tally(m);
                  const own = m.space.uploadedBy === user.id;
                  return (
                    <tr key={m.spaceId}>
                      <td><span className="bold">{m.space.name}</span><br /><span className="small muted">Added {m.space.addedAt}</span></td>
                      <td><Badge>New space</Badge></td>
                      <td><UserLink id={m.space.uploadedBy} you={false} /></td>
                      <td><Tally yes={t.yes} no={t.no} /></td>
                      <td className={own ? undefined : 'nowrap'}>{own ? <span className="small muted">You created this</span> : <Button to={`/moderation/${m.spaceId}`}>{myVote(m, user.id) ? 'Edit vote' : 'Review'}</Button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length + updates.length + claims.length === 0 && <p className="note">Nothing waiting{city !== 'all' ? ` in ${city}` : ''}.</p>}
          <p className="small muted">You can’t review spaces you created.</p>
          {isModerator && <div><Button to="/flags">Open the flag queue</Button></div>}
        </div>
        <StatusCard />
      </div>
    </Page>
  );
}

export function ModerationReview() {
  const { id } = useParams();
  const { state, dispatch, user, isModerator, isArchitect, get, visibleSpaces } = useDemo();
  const [note, setNote] = useState('');
  if (!isModerator && !isArchitect) return <Gate />;
  const space = get.space(id);
  if (!space) return <Page narrow><Empty title="Nothing to review"><p>This space doesn’t exist.</p></Empty></Page>;
  const m = reviewRow(state, id);
  const near = overlapping(space, visibleSpaces);
  const extra = space.photos.length - 4;

  return (
    <Page tag="simulated">
      <Crumbs items={[['/moderation', 'Waiting for review'], [null, space.name]]} />
      <div className="split">
        <div className="stack-lg">
          <header className="stack-sm">
            <div className="row"><StatusBadges space={space} />{space.status === 'approved' && <Badge kind="solid">Approved</Badge>}</div>
            <h1>{space.name}</h1>
            <p className="small muted">Created by <UserLink id={space.uploadedBy} you={false} /> on {space.addedAt}. <Link to={`/space/${space.id}`}>View public page</Link></p>
          </header>

          <section className="stack-sm" aria-label="Photos">
            <div className="review-photos">
              {space.photos.slice(0, 4).map((p, i) => <ImageBox key={p.id} src={p.src} alt={p.alt} label={i === 3 && extra > 0 ? `+${extra} more` : `Photo ${i + 1}`} />)}
            </div>
            <p className="small muted">{space.photos.length} photos. <Link to={`/space/${space.id}`}>See all on the space page</Link></p>
          </section>

          <section className="card stack-sm" aria-labelledby="loc-h">
            <h2 id="loc-h" className="h-sm">Location and area</h2>
            <p className="small">Check the point matches where the photos were taken and the drawn area covers the space, no more.</p>
            <AreaMap space={space} others={near.map((x) => x.s)} label={`${space.lat.toFixed(4)}, ${space.lng.toFixed(4)}`} />
            <h3 className="h-xs">Overlapping spaces ({near.length})</h3>
            {near.length === 0 ? (
              <p className="small muted">No other space’s area overlaps this one.</p>
            ) : (
              <ul className="list small">
                {near.map(({ s, d, inside }) => (
                  <li key={s.id} className="row between">
                    <span><Link to={`/space/${s.id}`}>{s.name}</Link> <span className="muted">{s.status === 'pending' ? 'Pending. ' : ''}{inside ? 'One area sits inside the other' : 'Areas overlap'}, centres {Math.round(d)} m apart</span></span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card stack-sm" aria-labelledby="q-h">
            <h2 id="q-h" className="h-sm">Questionnaire</h2>
            <dl className="dl">
              <dt>Feelings</dt><dd>{space.questionnaire.feelings}</dd>
              <dt>Transition</dt><dd>{space.questionnaire.transition}</dd>
              <dt>Materiality</dt><dd>{space.questionnaire.materiality}</dd>
              <dt>Sensory</dt><dd>{space.questionnaire.sensory}</dd>
            </dl>
          </section>

          <section className="stack-sm" aria-labelledby="notes-h">
            <h2 id="notes-h" className="h-sm">Reviewers’ notes ({(m.notes || []).length + Object.values(m.votes || {}).filter((v) => v.reason).length})</h2>
            <p className="small muted">Only reviewers see these. Reasons for no votes are also shown publicly.</p>
            <ul className="list small">
              {(m.notes || []).map((x, i) => <li key={`n${i}`}><UserLink id={x.by} you={false} className="bold" /> <span className="muted">{x.date}</span><br />{x.text}</li>)}
              {Object.entries(m.votes || {}).filter(([, v]) => v.reason).map(([by, v]) => (
                <li key={by}><UserLink id={by} you={false} className="bold" /> <Badge>Voted no</Badge> <span className="muted">{v.date}</span><br />{v.reason}{v.moveTo && <> Suggests moving it to <Link to={`/space/${v.moveTo}`}>{get.space(v.moveTo)?.name}</Link>.</>}</li>
              ))}
            </ul>
            {space.uploadedBy !== user.id && (
              <form className="stack-sm" onSubmit={(e) => { e.preventDefault(); if (note.trim()) { dispatch({ type: 'MOD_NOTE', spaceId: id, userId: user.id, text: note.trim() }); setNote(''); } }}>
                <Input label="Add a note for other reviewers" textarea value={note} onChange={(e) => setNote(e.target.value)} />
                <div><Button type="submit" disabled={!note.trim()}>Add note</Button></div>
              </form>
            )}
          </section>
        </div>

        <aside className="card stack review-aside">
          <h2 className="h-sm">Your review</h2>
          <ReviewForm key={space.id} space={space} />
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
