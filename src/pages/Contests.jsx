import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Badge, Button, Choice, Empty, FileDrop, FormActions, ImageBox, Input, Modal, Page, RoleGate } from '../components/ui.jsx';
import { ContestCard, ContestPlans, Crumbs, ELIGIBILITY, SpacePicker, UserLink, contestWinner } from '../components/domain.jsx';
import { useChoices } from '../design/choices.js';

// "2026-11-12" → "Nov 12, 2026"
const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'date not recorded');

export function Contests() {
  const { state, isPaid } = useDemo();
  return (
    <Page tag="clickable">
      <div className="row between">
        <div className="stack-sm">
          <h1>Contests</h1>
          <p className="prose muted">A co-host funds a prize for a space the community has documented and voted on. The co-host judges, and the winning architect sells the design to them.</p>
        </div>
        {isPaid && <Button to="/contest/request">Request to host a contest</Button>}
      </div>
      {[
        ['live', 'Open for entries', 'Architects can submit an entry until the deadline.'],
        ['judging', 'Judging', 'Entries are closed. Each co-host is judging against the criteria it set.'],
        ['closed', 'Closed', 'Winners, and what each co-host plans to do with the design.'],
      ].map(([status, title, note]) => {
        const list = state.contests.filter((c) => c.status === status);
        return (
          <section key={status} className="stack" aria-labelledby={`contests-${status}`}>
            <div className="stack-sm">
              <h2 id={`contests-${status}`}>{title} ({list.length})</h2>
              <p className="small muted">{note}</p>
            </div>
            {list.length ? <div className="grid">{list.map((c) => <ContestCard key={c.id} contest={c} />)}</div> : <p className="small muted">None right now.</p>}
          </section>
        );
      })}
    </Page>
  );
}

export function Contest() {
  const { id } = useParams();
  const { state, get, dispatch, user, isArchitect, isMember, cfg } = useDemo();
  const { contestEligibility } = useChoices();
  const rule = ELIGIBILITY[contestEligibility] || ELIGIBILITY.both;
  const nav = useNavigate();
  const [params] = useSearchParams();
  const c = get.contest(id);
  if (!c) return <Page narrow><Empty title="Contest not found"><div><Button to="/contests">Browse contests</Button></div></Empty></Page>;
  const space = get.space(c.spaceId);
  const mine = user && c.entries.find((e) => e.architectId === user.id);

  return (
    <Page tag="clickable">
      <Crumbs items={[['/contests', 'Contests'], [null, c.title]]} />
      <div className="split">
        <div className="stack">
          <div className="row"><Badge kind={c.status === 'live' ? 'solid' : ''}>{c.status === 'live' ? 'Open for entries' : c.status === 'judging' ? 'Judging' : 'Closed'}</Badge></div>
          <h1>{c.title}</h1>
          {contestWinner(c) && (
            <section className="winner-box" aria-labelledby="winner-h">
              <h2 id="winner-h" className="h-sm">Winner</h2>
              <div className="row row-top">
                <div className="winner-img"><ImageBox label="Winning design" /></div>
                <div className="stack-sm grow">
                  <span className="bold">{contestWinner(c).title}</span>
                  <span className="small">by <Link to={`/architect/${contestWinner(c).architectId}`}>{get.user(contestWinner(c).architectId)?.name}</Link>. Received the {c.prize} prize; the design was sold to {c.coHost}.</span>
                </div>
              </div>
              {c.plans?.length > 0 && (
                <>
                  <h3 className="h-xs">What happens next</h3>
                  <ContestPlans contest={c} />
                </>
              )}
            </section>
          )}
          <section className="stack-sm"><h2>Brief</h2><p className="prose">{c.brief}</p></section>
          <section className="stack-sm">
            <h2>Site</h2>
            <Link to={`/space/${space.id}`} className="card card-link">
              <ImageBox label="Site photo" shape="wide" />
              <span className="bold">{space.name}</span>
              <span className="small muted">{space.votes} community votes, {space.photos.length} photos. Open the space for the experience entries and spatial diagram.</span>
            </Link>
          </section>
          <section className="stack-sm">
            <h2>How entries are judged</h2>
            <p className="small muted">Criteria set by the co-host, who also judges.</p>
            <ul>{c.criteria.map((x) => <li key={x}>{x}</li>)}</ul>
          </section>
          <section className="stack-sm">
            <h2>Entries</h2>
            <p className="small"><span className="bold">{c.entries.length} {c.entries.length === 1 ? 'entry' : 'entries'}</span> submitted. Entries stay private to the co-host until a winner is announced.</p>
            {mine && <p className="small">You entered “{mine.title}”.</p>}
          </section>

        </div>
        <aside className="card sticky-aside">
          <span className="small muted">Prize money</span>
          <span className="display">{c.prize}</span>
          <span className="small">The winner receives the full prize.</span>
          <hr className="rule" />
          <dl className="dl">
            <dt>Deadline</dt><dd>{c.deadline}</dd>
            <dt>Co-host</dt><dd>{c.coHost}</dd>
            <dt>Who can enter</dt><dd>{rule.text}</dd>
            <dt>Entries</dt><dd>{c.entries.length}</dd>
          </dl>
          {user && c.coHostId === user.id && c.status === 'judging' ? (
            <div className="stack-sm">
              <Badge kind="solid">Ready to judge</Badge>
              <Button variant="primary" to={`/contest/${c.id}/judge`}>Judge entries</Button>
              <span className="xs muted">You’re the co-host. Entries closed on {c.deadline}.</span>
            </div>
          ) : user && c.coHostId === user.id ? (
            <p className="small muted">You’re the co-host.{c.status === 'live' ? ' You can judge once the deadline passes.' : ''}</p>
          ) : c.status !== 'live' ? (
            <p className="small muted">{c.status === 'judging' ? 'Entries are closed. The co-host is judging.' : 'This contest is closed.'}</p>
          ) : mine ? (
            <p className="small bold">You entered “{mine.title}”.</p>
          ) : isArchitect && !rule.can(state.architectKind) ? (
            <p className="small muted">{rule.no} You’re signed in as {state.architectKind === 'student' ? 'a student' : 'a licensed architect'}.</p>
          ) : isArchitect ? (
            <Button variant="primary" to={`/contest/${c.id}/enter`}>Submit an entry</Button>
          ) : (
            <p className="small muted">{isMember ? 'Only architects can enter contests.' : 'Sign up as an architect to enter.'}</p>
          )}
        </aside>
      </div>
    </Page>
  );
}

// Hosting ends at "Send request": the team reviews it. Judging is its own flow,
// opened from the contest page or from Contributions › Hosted contests.
export function ContestRequest() {
  const { state, dispatch, isPaid, user } = useDemo();
  const [sent, setSent] = useState(null);
  const approved = state.spaces.filter((s) => !s.removed && s.status === 'approved');
  const [f, setF] = useState({ spaceId: '', isPrivate: 'no', deed: [], brief: '', prize: '', criteria: '' });
  const [err, setErr] = useState('');
  if (!isPaid) {
    return (
      <Page narrow>
        <RoleGate title="Hosting a contest needs a paid account">Paid accounts (authorities, NGOs, owners, resident groups) can request to host.</RoleGate>
        <div><Button to="/membership">Compare free and paid</Button></div>
      </Page>
    );
  }
  const send = () => {
    if (!f.spaceId) return setErr('Choose the space the contest is for.');
    if (!f.brief.trim() || !f.prize.trim()) return setErr('Add a brief and a prize.');
    if (f.isPrivate === 'yes' && f.deed.length === 0) return setErr('A private space needs its owner as co-host. Upload the deed so the team can verify it.');
    setErr('');
    const request = { spaceId: f.spaceId, brief: f.brief.trim(), prize: `$${f.prize.trim()}`, criteria: f.criteria.trim(), isPrivate: f.isPrivate === 'yes' };
    dispatch({ type: 'REQUEST_CONTEST', userId: user.id, request });
    setSent(request);
    window.scrollTo(0, 0);
    return null;
  };
  if (sent) {
    const space = state.spaces.find((x) => x.id === sent.spaceId);
    return (
      <Page narrow>
        <div className="alert stack-sm">
          <h1 className="h-md">Request sent</h1>
          <p>The team looks at each request case by case and will notify you when it’s approved. {sent.isPrivate ? 'Your deed was received; ownership is being verified. ' : ''}Once the contest opens, track it under Contributions, in Hosted contests.</p>
        </div>
        <dl className="dl">
          <dt>Space</dt><dd>{space?.name}</dd>
          <dt>Prize you’ll fund</dt><dd>{sent.prize}, held in escrow when the contest opens</dd>
          <dt>Brief</dt><dd>{sent.brief}</dd>
        </dl>
        <div className="row"><Button variant="primary" to="/contributions#hosted">See hosted contests</Button><Button to="/contests">Back to contests</Button></div>
      </Page>
    );
  }
  return (
    <Page narrow>
      <h1>Host a contest</h1>
      <p className="prose muted">Fund a prize for a documented space. The team reviews each request; once it’s approved the contest opens for entries, and you judge when the deadline passes.</p>
      <div className="stack">
        <SpacePicker spaces={approved} value={f.spaceId} onChange={(spaceId) => { setF({ ...f, spaceId }); setErr(''); }} />
        <div className="field">
          <span className="label">Is this a private space?</span>
          <Choice name="priv" checked={f.isPrivate === 'no'} onChange={() => setF({ ...f, isPrivate: 'no' })} title="No, it is public" />
          <Choice name="priv" checked={f.isPrivate === 'yes'} onChange={() => setF({ ...f, isPrivate: 'yes' })} title="Yes, it is privately owned">The owner must co-host, and the team verifies the deed.</Choice>
        </div>
        {f.isPrivate === 'yes' && <FileDrop label="Deed or other proof of ownership" files={f.deed} onChange={(deed) => setF({ ...f, deed })} samples={['deed-scan.pdf']} />}
        <Input label="Brief" textarea value={f.brief} onChange={(e) => setF({ ...f, brief: e.target.value })} />
        <Input label="Prize you will fund" prefix="$" inputMode="decimal" value={f.prize} onChange={(e) => setF({ ...f, prize: e.target.value.replace(/[^\d,.]/g, '') })} placeholder="2,500" hint="Held in escrow when the contest opens. The winner receives all of it." />
        <Input label="Judging criteria (you set these, and you judge)" textarea value={f.criteria} onChange={(e) => setF({ ...f, criteria: e.target.value })} hint="One per line." />
        {err && <span className="error" role="alert">{err}</span>}
        <FormActions><Button variant="primary" onClick={send}>Send request</Button></FormActions>
      </div>
    </Page>
  );
}

// Judging: the host reads every entry, scores it, leaves a comment, then picks a winner.
export function ContestJudge() {
  const { id } = useParams();
  const { get, dispatch, user } = useDemo();
  const c = get.contest(id);
  const [current, setCurrent] = useState(c?.entries[0]?.id);
  const [winner, setWinner] = useState(c?.winner || null);
  const [confirm, setConfirm] = useState(false);
  if (!c) return <Page narrow><Empty title="Contest not found"><div><Button to="/contests">Browse contests</Button></div></Empty></Page>;
  const host = user && c.coHostId === user.id;
  if (!host) {
    return <Page narrow><RoleGate title="Only the co-host judges this contest">{c.coHost} set the criteria and picks the winner.</RoleGate><div><Button to={`/contest/${c.id}`}>Back to the contest</Button></div></Page>;
  }
  const review = c.review || {};
  const e = c.entries.find((x) => x.id === current) || c.entries[0];
  const r = review[e.id] || {};
  const done = (x) => c.criteria.every((cr) => review[x.id]?.scores?.[cr]);
  const total = (x) => c.criteria.reduce((t, cr) => t + Number(review[x.id]?.scores?.[cr] || 0), 0);
  const patch = (p) => dispatch({ type: 'JUDGE_ENTRY', contestId: c.id, entryId: e.id, patch: p });
  const closed = c.status === 'closed';
  const won = c.entries.find((x) => x.id === c.winner);

  if (closed && won) {
    return (
      <Page narrow>
        <Crumbs items={[['/contributions#hosted', 'Hosted contests'], [`/contest/${c.id}`, c.title], [null, 'Judging']]} />
        <div className="alert stack-sm">
          <h1 className="h-md">Winner announced: {won.title}</h1>
          <p>Your prize was held in escrow when the contest opened. It’s now paid to the winner, and your comments are shared with each architect.</p>
        </div>
        <dl className="dl">
          <dt>Winner</dt><dd>{won.title} by <UserLink id={won.architectId} /></dd>
          <dt>Prize</dt><dd>{c.prize}, paid in full to the winner</dd>
          <dt>Design</dt><dd>Sold to you as co-host, at the price you set</dd>
        </dl>
        <div className="row"><Button to={`/contest/${c.id}`}>View the contest page</Button><Button to="/contributions#hosted">Back to hosted contests</Button></div>
      </Page>
    );
  }
  return (
    <Page wide>
      <Crumbs items={[['/contributions#hosted', 'Hosted contests'], [`/contest/${c.id}`, c.title], [null, 'Judging']]} />
      <div className="row between">
        <div className="stack-sm">
          <h1>Judge: {c.title}</h1>
          <p className="small muted">Read each entry, score it against your criteria and leave a comment. Comments are shared with each architect when you announce the winner.</p>
        </div>
        <Badge kind="solid">Ready to judge</Badge>
      </div>
      <div className="judge">
        <nav className="judge-list" aria-label="Entries">
          <h2 className="h-xs">Entries ({c.entries.length})</h2>
          <ul>
            {c.entries.map((x, i) => (
              <li key={x.id}>
                <button type="button" className="judge-item" aria-current={x.id === e.id ? 'true' : undefined} onClick={() => setCurrent(x.id)}>
                  <span className="row between"><span className="bold small">{i + 1}. {x.title}</span>{winner === x.id && <Badge kind="solid">Your pick</Badge>}</span>
                  <span className="xs muted">{get.user(x.architectId)?.name}</span>
                  <span className="xs">{done(x) ? `Scored ${total(x)} of ${c.criteria.length * 5}` : 'Not scored yet'}{review[x.id]?.comment ? ', commented' : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <article className="judge-entry stack" aria-labelledby="entry-h">
          <div className="stack-sm">
            <h2 id="entry-h">{e.title}</h2>
            <p className="small">By <UserLink id={e.architectId} />{e.collaborators?.length ? <> with {e.collaborators.map((u, i) => <span key={u}>{i ? ', ' : ''}<UserLink id={u} /></span>)}</> : null}. Submitted {e.submittedAt}.</p>
          </div>
          <div className="judge-images">
            <ImageBox label="Plan" />
            <ImageBox label="Section" />
            <ImageBox label="View" />
          </div>
          <p className="prose">{e.summary || 'The architect’s description of the design appears here.'}</p>
          {e.files?.length > 0 && <p className="small">Files: {e.files.join(', ')}</p>}
          <section className="stack-sm judge-scores" aria-labelledby="scores-h">
            <h3 id="scores-h" className="h-xs">Your scores (1 to 5)</h3>
            {c.criteria.map((cr) => (
              <fieldset key={cr} className="score-row">
                <legend className="small">{cr}</legend>
                <div className="score-scale">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="score-opt">
                      <input type="radio" name={`${e.id}-${cr}`} checked={Number(r.scores?.[cr]) === n} onChange={() => patch({ scores: { ...(r.scores || {}), [cr]: n } })} />
                      <span>{n}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </section>
          <Input label="Comment" textarea rows={3} value={r.comment || ''} onChange={(ev) => patch({ comment: ev.target.value })} hint="Shared with the architect when you announce the winner." />
          <label className="choice">
            <input type="radio" name="winner" checked={winner === e.id} onChange={() => setWinner(e.id)} />
            <span className="bold">Pick this entry as the winner</span>
          </label>
          <div className="row between">
            <div className="row">
              <Button disabled={c.entries[0].id === e.id} onClick={() => setCurrent(c.entries[c.entries.indexOf(e) - 1].id)}>Previous entry</Button>
              <Button disabled={c.entries[c.entries.length - 1].id === e.id} onClick={() => setCurrent(c.entries[c.entries.indexOf(e) + 1].id)}>Next entry</Button>
            </div>
            <Button variant="primary" disabled={!winner} onClick={() => setConfirm(true)}>Announce winner</Button>
          </div>
        </article>
      </div>
      {confirm && (
        <Modal title="Announce the winner?" onClose={() => setConfirm(false)}>
          <p>{c.entries.find((x) => x.id === winner)?.title} by {get.user(c.entries.find((x) => x.id === winner)?.architectId)?.name} wins the {c.prize} prize. This can’t be undone.</p>
          <p className="small muted">{c.entries.filter((x) => !review[x.id]?.comment).length ? `${c.entries.filter((x) => !review[x.id]?.comment).length} entries have no comment yet.` : 'Every entry has a comment.'}</p>
          <FormActions>
            <Button onClick={() => setConfirm(false)}>Keep judging</Button>
            <Button variant="primary" onClick={() => { dispatch({ type: 'PICK_WINNER', contestId: c.id, entryId: winner }); setConfirm(false); window.scrollTo(0, 0); }}>Announce winner</Button>
          </FormActions>
        </Modal>
      )}
    </Page>
  );
}
