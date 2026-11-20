import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Badge, Button, Choice, Empty, FileDrop, FormActions, ImageBox, Input, Modal, Page, RoleGate, Select } from '../components/ui.jsx';
import { ContestCard, ContestMoney, ContestPlans, ContestRounds, Crumbs, ELIGIBILITY, SpacePicker, UserLink, contestStatus, contestWinner, coverPhoto } from '../components/domain.jsx';
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
          <p className="prose muted">A co-host funds a prize for a space the community has documented and voted on, and pays every architect who enters. The co-host judges, and the winning architect sells the design to them.</p>
        </div>
        {isPaid && <Button to="/contest/request">Request to host a contest</Button>}
      </div>
      {[
        ['live', 'Open now', 'Round 1 takes light concepts from any eligible architect. In round 2, the paid shortlist develops full proposals.'],
        ['judging', 'With the co-host', 'A round has closed. The co-host is picking the shortlist or the winner.'],
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
  const rule = ELIGIBILITY.both;   // round 35: open to any architect
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
          <div className="row"><Badge kind={c.status === 'live' ? 'solid' : ''}>{contestStatus(c)}</Badge></div>
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
              <BuildReport contest={c} space={space} />
            </section>
          )}
          <section className="stack-sm"><h2>Brief</h2><p className="prose">{c.brief}</p></section>
          <section className="stack-sm">
            <h2>Site</h2>
            <Link to={`/space/${space.id}`} className="card card-link">
              <ImageBox label="Site photo" shape="wide" src={(coverPhoto(space) || space.archive?.flatMap((r) => r.photos || []).find((p) => p.src))?.src} alt={coverPhoto(space)?.alt} />
              <span className="bold">{space.name}</span>
              <span className="small muted">{space.votes} community votes, {space.photos.length} photos. Open the space for the experience entries and spatial diagram.</span>
            </Link>
          </section>
          <section className="stack-sm" aria-labelledby="rounds-h">
            <h2 id="rounds-h">How it works: two rounds</h2>
            <ContestRounds contest={c} />
          </section>
          <section className="stack-sm" aria-labelledby="money-h">
            <h2 id="money-h">Who is paid</h2>
            <p className="small">Not just the winner: every shortlisted architect is paid {c.shortlistPay} to develop their idea in round 2.</p>
            <ContestMoney contest={c} />
          </section>
          <section className="stack-sm">
            <h2>How entries are judged</h2>
            <p className="small muted">Criteria set by the co-host, who also judges.</p>
            <ul>{c.criteria.map((x) => <li key={x}>{x}</li>)}</ul>
          </section>
          <section className="stack-sm">
            <h2>Entries</h2>
            <p className="small"><span className="bold">{c.entries.length} {c.entries.length === 1 ? 'concept' : 'concepts'}</span> submitted{c.phase === 2 ? `, ${c.shortlist.length} shortlisted` : ''}. Entries stay private to the co-host until the winner is announced.</p>
            {mine && <p className="small">You entered “{mine.title}”{c.phase === 2 ? (c.shortlist.includes(mine.id) ? ', and it’s shortlisted.' : '. It wasn’t shortlisted; it’s still yours to publish in the Redesign Library.') : '.'}</p>}
          </section>

        </div>
        <aside className="card sticky-aside">
          <Badge kind={c.status === 'live' ? 'solid' : ''}>{contestStatus(c)}</Badge>
          <span className="small muted">Prize money</span>
          <span className="display">{c.prize}</span>
          <span className="small">Plus <span className="bold">{c.shortlistPay}</span> to each of the {c.shortlistSize} shortlisted architects.</span>
          <hr className="rule" />
          <dl className="dl">
            <dt>Round 1 deadline</dt><dd>{fmtDate(c.deadline)}<br /><span className="xs muted">Concepts from anyone eligible</span></dd>
            <dt>Round 2 deadline</dt><dd>{fmtDate(c.deadline2)}<br /><span className="xs muted">Full proposals from the shortlist</span></dd>
            <dt>Co-host</dt><dd>{c.coHost}</dd>
            <dt>Who can enter</dt><dd>{rule.text}</dd>
            <dt>Entry fee</dt><dd>Free for paid members, {c.entryFee} for others</dd>
            <dt>Concepts</dt><dd>{c.entries.length}</dd>
          </dl>
          {user && c.coHostId === user.id && c.status === 'judging' ? (
            <div className="stack-sm">
              <Badge kind="accent">Ready to judge</Badge>
              <Button variant="primary" to={`/contest/${c.id}/judge`}>{c.phase === 2 ? 'Judge final proposals' : 'Pick the shortlist'}</Button>
              <span className="xs muted">You’re the co-host. Round {c.phase} closed on {fmtDate(c.phase === 2 ? c.deadline2 : c.deadline)}.</span>
            </div>
          ) : user && c.coHostId === user.id ? (
            <p className="small muted">You’re the co-host.{c.status === 'live' ? ` You’ll ${c.phase === 2 ? 'judge the proposals' : 'pick the shortlist'} once this round’s deadline passes.` : ''}</p>
          ) : c.status === 'closed' ? (
            <p className="small muted">This contest is closed.</p>
          ) : c.status === 'judging' ? (
            <p className="small muted">{c.phase === 2 ? 'Proposals are in. The co-host is picking the winner.' : 'Round 1 is closed. The co-host is picking the shortlist.'}</p>
          ) : c.phase === 2 ? (
            mine && c.shortlist.includes(mine.id)
              ? (mine.proposal ? <p className="small bold">Your full proposal is in.</p> : <Button variant="primary" to={`/contest/${c.id}/enter`}>Submit your full proposal</Button>)
              : <p className="small muted">Round 2 is for the shortlisted architects.</p>
          ) : mine ? (
            <p className="small bold">You entered “{mine.title}”.</p>
          ) : isArchitect && !rule.can(state.architectKind) ? (
            <p className="small muted">{rule.no} You’re signed in as {state.architectKind === 'student' ? 'a student' : 'a licensed architect'}.</p>
          ) : isArchitect ? (
            <>
              <Button variant="primary" to={`/contest/${c.id}/enter`}>Submit an entry</Button>
              <span className="xs muted">Round 1 asks for one concept sheet and a short statement.{user?.paid ? ' Free for you as a paid member.' : ` Entry fee ${c.entryFee}, or free with the paid tier.`}</span>
            </>
          ) : (
            <>
              {/* Round 33: the way in is visible to everyone; non-architects verify first. */}
              <Button variant="primary" to="/architects">Submit an entry</Button>
              <span className="xs muted">Only architects enter contests. {isMember ? 'Verify as an architect first; it takes a few minutes.' : 'Sign up as an architect to enter.'}</span>
            </>
          )}
        </aside>
      </div>
    </Page>
  );
}

// Round 23: once the winning design is built, the co-host reports it. A moderator
// confirms it, which archives the space's old round and marks it Redesigned.
function BuildReport({ contest: c, space }) {
  const { state, user, dispatch } = useDemo();
  const won = c.entries.find((e) => e.id === c.winner);
  if (!won || !space) return null;
  const report = state.updateReports.find((r) => r.contestId === c.id);
  const host = user && user.id === c.coHostId;
  if (space.redesigned?.contestId === c.id) {
    return <p className="note small">Built. <Link to={`/space/${space.id}`}>{space.name}</Link> is marked Redesigned, its earlier contributions are archived, and a new round of experiences has started.</p>;
  }
  if (report?.status === 'pending') return <p className="note small">Build reported on {report.date}. A moderator will confirm it and mark the space Redesigned.</p>;
  // Round 24: the host only says it's built; someone on the ground reports it from the
  // space page with photos, so the record is checked independently.
  if (c.built) {
    return (
      <p className="note small">
        {host ? 'You marked this as built' : 'The host marked this as built'} on {c.built}. Anyone who visits <Link to={`/space/${space.id}`}>{space.name}</Link> can now report the build there (Options › Report an update); a moderator then confirms it.
      </p>
    );
  }
  if (!host) return null;
  return (
    <div className="stack-sm">
      <p className="small">Once “{won.title}” is built, mark it here. People who visit the space then report it with photos, a moderator checks it, and the space is marked Redesigned.</p>
      <div><Button onClick={() => dispatch({ type: 'CONTEST_BUILT', contestId: c.id })}>Mark as built</Button></div>
    </div>
  );
}

// Hosting ends at "Send request": the team reviews it. Judging is its own flow,
// opened from the contest page or from Contributions › Hosted contests.
export function ContestRequest() {
  const { state, dispatch, isPaid, user } = useDemo();
  const [sent, setSent] = useState(null);
  const approved = state.spaces.filter((s) => !s.removed && s.status === 'approved');
  // ?space= preselects the space (from a space page or the demo walkthrough).
  const [params] = useSearchParams();
  const pre = approved.some((x) => x.id === params.get('space')) ? params.get('space') : '';
  const [f, setF] = useState({ spaceId: pre, isPrivate: 'no', deed: [], brief: '', budget: '', shortlistSize: '5', shortlistPay: '', deadline: plusDays(42), deadline2: plusDays(98), criteria: '' });
  const [payEdited, setPayEdited] = useState(false);
  const [err, setErr] = useState('');
  if (!isPaid) {
    return (
      <Page narrow>
        <RoleGate title="Hosting a contest needs a paid account">Paid accounts (authorities, NGOs, owners, resident groups) can request to host.</RoleGate>
        <div><Button to="/membership">Compare free and paid</Button></div>
      </Page>
    );
  }
  const num = (v) => Number(String(v).replace(/[^\d.]/g, '')) || 0;
  const budget = num(f.budget);
  const n = Number(f.shortlistSize);
  // Suggested payment per shortlisted architect: 10% of the budget each, rounded to $50.
  const suggested = budget ? Math.max(50, Math.round((budget * 0.1) / 50) * 50) : 0;
  const pay = payEdited ? num(f.shortlistPay) : suggested;
  const prize = budget - n * pay;
  const money = (v) => `$${Math.round(v).toLocaleString('en-US')}`;
  const send = () => {
    if (!f.spaceId) return setErr('Choose the space the contest is for.');
    if (!f.brief.trim()) return setErr('Add a brief.');
    if (!budget) return setErr('Enter the total amount you will fund.');
    if (!pay) return setErr('Set how much each shortlisted architect is paid.');
    if (prize <= 0) return setErr(`The shortlist payments (${money(n * pay)}) use up the whole budget. Lower the payment or raise the budget so there is a prize.`);
    if (f.deadline2 <= f.deadline) return setErr('Round 2’s deadline has to come after round 1’s.');
    if (f.isPrivate === 'yes' && f.deed.length === 0) return setErr('A private space needs its owner as co-host. Upload the deed so the team can verify it.');
    setErr('');
    const request = { spaceId: f.spaceId, brief: f.brief.trim(), budget: money(budget), prize: money(prize), shortlistSize: n, shortlistPay: money(pay), deadline: f.deadline, deadline2: f.deadline2, criteria: f.criteria.trim(), isPrivate: f.isPrivate === 'yes' };
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
          <dt>Total you’ll fund</dt><dd>{sent.budget}, held in escrow when the contest opens</dd>
          <dt>Shortlist</dt><dd>{sent.shortlistSize} architects, paid {sent.shortlistPay} each to develop their idea</dd>
          <dt>Prize to the winner</dt><dd>{sent.prize}</dd>
          <dt>Deadlines</dt><dd>Round 1 concepts: {fmtDate(sent.deadline)}. Round 2 proposals: {fmtDate(sent.deadline2)}.</dd>
          <dt>Brief</dt><dd>{sent.brief}</dd>
        </dl>
        <div className="row"><Button variant="primary" to="/contributions#hosted">See hosted contests</Button><Button to="/contests">Back to contests</Button></div>
      </Page>
    );
  }
  return (
    <Page narrow className="form-full">
      <h1>Host a contest</h1>
      <p className="prose muted">Fund a contest for a documented space. It runs in two rounds: anyone eligible sends a light concept, you shortlist a few, and the shortlist is paid to develop full proposals before you pick a winner.</p>
      <div className="stack">
        <SpacePicker spaces={approved} value={f.spaceId} onChange={(spaceId) => { setF({ ...f, spaceId }); setErr(''); }} />
        <div className="field">
          <span className="label">Is this a private space?</span>
          <Choice name="priv" checked={f.isPrivate === 'no'} onChange={() => setF({ ...f, isPrivate: 'no' })} title="No, it is public" />
          <Choice name="priv" checked={f.isPrivate === 'yes'} onChange={() => setF({ ...f, isPrivate: 'yes' })} title="Yes, it is privately owned">The owner must co-host, and the team verifies the deed.</Choice>
        </div>
        {f.isPrivate === 'yes' && <FileDrop label="Deed or other proof of ownership" files={f.deed} onChange={(deed) => setF({ ...f, deed })} samples={['deed-scan.pdf']} />}
        <Input label="Brief" textarea value={f.brief} onChange={(e) => setF({ ...f, brief: e.target.value })} />

        <fieldset className="stack plain">
          <legend className="h-sm">Money and shortlist</legend>
          <Input label="Total you will fund" prefix="$" inputMode="decimal" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value.replace(/[^\d,.]/g, '') })} placeholder="4,000" hint="Everything the contest pays out: the shortlist payments and the winner’s prize. Held in escrow when the contest opens." />
          <Select label="How many architects to shortlist" value={f.shortlistSize} onChange={(e) => setF({ ...f, shortlistSize: e.target.value })} options={['3', '4', '5', '6', '7', '8'].map((v) => ({ value: v, label: v === '5' ? '5 (suggested)' : v }))} hint="We suggest 5: enough range to choose from, few enough that each can be paid properly. After the shortlist is picked, those architects develop their idea into a full proposal." />
          <Input label="Payment to each shortlisted architect" prefix="$" inputMode="decimal" value={payEdited ? f.shortlistPay : (suggested ? suggested.toLocaleString('en-US') : '')} onChange={(e) => { setPayEdited(true); setF({ ...f, shortlistPay: e.target.value.replace(/[^\d,.]/g, '') }); }} placeholder="400" hint={payEdited ? 'Paid for their time in round 2, whether or not they win.' : 'Suggested: 10% of the total each. Paid for their time in round 2, whether or not they win.'} />
          <div className={`card budget-split ${budget && prize <= 0 ? 'is-over' : ''}`} aria-live="polite">
            <span className="small muted">How your {budget ? money(budget) : 'budget'} is split</span>
            <dl className="dl">
              <dt>Shortlist</dt><dd>{n} × {pay ? money(pay) : '$—'} = {pay ? money(n * pay) : '$—'}</dd>
              <dt>Prize to the winner</dt><dd className="bold">{budget ? (prize > 0 ? money(prize) : 'Nothing left for a prize') : '$—'}</dd>
            </dl>
          </div>
        </fieldset>

        <fieldset className="stack plain">
          <legend className="h-sm">Deadlines</legend>
          <div className="field-row">
            <Input label="Round 1: concepts due" type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} hint="Open to every eligible architect." />
            <Input label="Round 2: full proposals due" type="date" value={f.deadline2} onChange={(e) => setF({ ...f, deadline2: e.target.value })} hint="For the shortlist only." />
          </div>
        </fieldset>
        <Input label="Judging criteria (you set these, and you judge)" textarea value={f.criteria} onChange={(e) => setF({ ...f, criteria: e.target.value })} hint="One per line." />
        {err && <span className="error" role="alert">{err}</span>}
        <FormActions><Button variant="primary" onClick={send}>Send request</Button></FormActions>
      </div>
    </Page>
  );
}

const plusDays = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

// Judging, in two passes. Round 1: the host reads every concept, comments, and
// picks the shortlist. Round 2: the host reads the shortlist's full proposals,
// scores them and picks the winner.
export function ContestJudge() {
  const { id } = useParams();
  const { get, dispatch, user } = useDemo();
  const c = get.contest(id);
  const [current, setCurrent] = useState(null);
  const [picks, setPicks] = useState([]);
  const [winner, setWinner] = useState(c?.winner || null);
  const [confirm, setConfirm] = useState(false);
  if (!c) return <Page narrow><Empty title="Contest not found"><div><Button to="/contests">Browse contests</Button></div></Empty></Page>;
  const host = user && c.coHostId === user.id;
  if (!host) {
    return <Page narrow><RoleGate title="Only the co-host judges this contest">{c.coHost} set the criteria and picks the shortlist and the winner.</RoleGate><div><Button to={`/contest/${c.id}`}>Back to the contest</Button></div></Page>;
  }
  const crumbs = <Crumbs items={[['/contributions#hosted', 'Hosted contests'], [`/contest/${c.id}`, c.title], [null, 'Judging']]} />;
  const won = c.entries.find((x) => x.id === c.winner);

  if (c.status === 'closed' && won) {
    return (
      <Page narrow>
        {crumbs}
        <div className="alert stack-sm">
          <h1 className="h-md">Winner announced: {won.title}</h1>
          <p>The prize was held in escrow when the contest opened and is now paid to the winner. The shortlist was paid {c.shortlistPay} each for round 2, and your comments are shared with each architect.</p>
        </div>
        <dl className="dl">
          <dt>Winner</dt><dd>{won.title} by <UserLink id={won.architectId} /></dd>
          <dt>Prize</dt><dd>{c.prize}, paid to the winner</dd>
          <dt>Shortlist</dt><dd>{c.shortlist.length} × {c.shortlistPay}</dd>
          <dt>Design</dt><dd>Sold to you as co-host, at the price you set. The other entries stay with their architects.</dd>
        </dl>
        <div className="row"><Button to={`/contest/${c.id}`}>View the contest page</Button><Button to="/contributions#hosted">Back to hosted contests</Button></div>
      </Page>
    );
  }
  if (c.status === 'live') {
    return (
      <Page narrow>
        {crumbs}
        <div className="alert stack-sm">
          <h1 className="h-md">{c.phase === 2 ? 'Round 2 is under way' : 'Round 1 is open'}</h1>
          <p>{c.phase === 2 ? `Your ${c.shortlist.length} shortlisted architects are developing full proposals, due ${fmtDate(c.deadline2)}. You’ll judge them after that date.` : `Concepts are due ${fmtDate(c.deadline)}. You’ll pick the shortlist after that date.`}</p>
        </div>
        <ContestRounds contest={c} />
        <div className="row">
          <Button to={`/contest/${c.id}`}>View the contest page</Button>
          {c.phase === 2 ? (
            <button type="button" className="demo-btn demo-btn-inline" onClick={() => dispatch({ type: 'END_ROUND_2', contestId: c.id })}>
              <span className="demo-btn-tag" aria-hidden="true">Demo</span> Skip to the round 2 deadline
            </button>
          ) : (
            <button type="button" className="demo-btn demo-btn-inline" onClick={() => dispatch({ type: 'END_ROUND_1', contestId: c.id })}>
              <span className="demo-btn-tag" aria-hidden="true">Demo</span> Skip to the round 1 deadline
            </button>
          )}
        </div>
      </Page>
    );
  }

  // c.status === 'judging'
  const final = c.phase === 2;
  const pool = final ? c.entries.filter((x) => c.shortlist.includes(x.id)) : c.entries;
  const review = c.review || {};
  const e = pool.find((x) => x.id === current) || pool[0];
  const r = review[e.id] || {};
  const patch = (p) => dispatch({ type: 'JUDGE_ENTRY', contestId: c.id, entryId: e.id, patch: p });
  const done = (x) => c.criteria.every((cr) => review[x.id]?.scores?.[cr]);
  const total = (x) => c.criteria.reduce((t, cr) => t + Number(review[x.id]?.scores?.[cr] || 0), 0);
  const full = picks.length >= c.shortlistSize;
  const togglePick = (x) => setPicks(picks.includes(x) ? picks.filter((y) => y !== x) : full ? picks : [...picks, x]);
  const idx = pool.indexOf(e);
  return (
    <Page wide>
      {crumbs}
      <div className="row between">
        <div className="stack-sm">
          <h1>{final ? `Pick the winner: ${c.title}` : `Pick the shortlist: ${c.title}`}</h1>
          <p className="small muted">
            {final
              ? `Read each shortlisted proposal, score it against your criteria and leave a comment. The winner receives the ${c.prize} prize.`
              : `Read each concept and leave a comment. Shortlist up to ${c.shortlistSize}; each is paid ${c.shortlistPay} to develop a full proposal by ${fmtDate(c.deadline2)}. The rest keep their rights and can publish in the Redesign Library.`}
          </p>
        </div>
        <Badge kind="accent">Ready to judge</Badge>
      </div>
      <div className="judge">
        <nav className="judge-list" aria-label={final ? 'Shortlisted proposals' : 'Concepts'}>
          <h2 className="h-xs">{final ? `Shortlist (${pool.length})` : `Concepts (${pool.length})`}</h2>
          {!final && <p className="xs muted">{picks.length} of {c.shortlistSize} shortlisted</p>}
          <ul>
            {pool.map((x, i) => (
              <li key={x.id}>
                <button type="button" className="judge-item" aria-current={x.id === e.id ? 'true' : undefined} onClick={() => setCurrent(x.id)}>
                  <span className="row between"><span className="bold small">{i + 1}. {x.title}</span>{(final ? winner === x.id : picks.includes(x.id)) && <Badge kind="solid">{final ? 'Your pick' : 'Shortlisted'}</Badge>}</span>
                  <span className="xs muted">{get.user(x.architectId)?.name}</span>
                  <span className="xs">{final ? (done(x) ? `Scored ${total(x)} of ${c.criteria.length * 5}` : 'Not scored yet') : ''}{review[x.id]?.comment ? `${final ? ', ' : ''}Commented` : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <article className="judge-entry stack" aria-labelledby="entry-h">
          <div className="stack-sm">
            <span className="xs muted">{final ? 'Full proposal' : 'Round 1 concept'}</span>
            <h2 id="entry-h">{e.title}</h2>
            <p className="small">By <UserLink id={e.architectId} />{e.collaborators?.length ? <> with {e.collaborators.map((u, i) => <span key={u}>{i ? ', ' : ''}<UserLink id={u} /></span>)}</> : null}. Submitted {e.submittedAt}.</p>
          </div>
          <div className="judge-images">
            {final ? <><ImageBox label="Plan" /><ImageBox label="Section" /><ImageBox label="View" /></> : <ImageBox label="Concept sheet" shape="wide" />}
          </div>
          <p className="prose">{e.summary || e.statement || 'The architect’s statement about the idea appears here.'}</p>
          {(final ? e.proposal?.files || e.files : e.files)?.length > 0 && <p className="small">Files: {(final ? e.proposal?.files || e.files : e.files).join(', ')}</p>}
          {final && (
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
          )}
          <Input label="Comment" textarea rows={3} value={r.comment || ''} onChange={(ev) => patch({ comment: ev.target.value })} hint={final ? 'Shared with the architect when you announce the winner.' : 'Shared with the architect when you confirm the shortlist.'} />
          {final ? (
            <label className="choice">
              <input type="radio" name="winner" checked={winner === e.id} onChange={() => setWinner(e.id)} />
              <span className="bold">Pick this proposal as the winner</span>
            </label>
          ) : (
            <label className="choice">
              <input type="checkbox" checked={picks.includes(e.id)} disabled={!picks.includes(e.id) && full} onChange={() => togglePick(e.id)} />
              <span className="bold">Add to the shortlist</span>
              {!picks.includes(e.id) && full && <span className="xs muted">The shortlist is full ({c.shortlistSize}). Remove one to add this.</span>}
            </label>
          )}
          <div className="row between">
            <div className="row">
              <Button disabled={idx === 0} onClick={() => setCurrent(pool[idx - 1].id)}>Previous</Button>
              <Button disabled={idx === pool.length - 1} onClick={() => setCurrent(pool[idx + 1].id)}>Next</Button>
            </div>
            {final
              ? <Button variant="primary" disabled={!winner} onClick={() => setConfirm(true)}>Announce winner</Button>
              : <Button variant="primary" disabled={!picks.length} onClick={() => setConfirm(true)}>Confirm shortlist ({picks.length})</Button>}
          </div>
        </article>
      </div>
      {confirm && final && (
        <Modal title="Announce the winner?" onClose={() => setConfirm(false)}>
          <p>{c.entries.find((x) => x.id === winner)?.title} by {get.user(c.entries.find((x) => x.id === winner)?.architectId)?.name} wins the {c.prize} prize. This can’t be undone.</p>
          <FormActions>
            <Button onClick={() => setConfirm(false)}>Keep judging</Button>
            <Button variant="primary" onClick={() => { dispatch({ type: 'PICK_WINNER', contestId: c.id, entryId: winner }); setConfirm(false); window.scrollTo(0, 0); }}>Announce winner</Button>
          </FormActions>
        </Modal>
      )}
      {confirm && !final && (
        <Modal title={`Shortlist ${picks.length} ${picks.length === 1 ? 'concept' : 'concepts'}?`} onClose={() => setConfirm(false)}>
          <ul className="small">{picks.map((x) => <li key={x}>{c.entries.find((y) => y.id === x)?.title} by {get.user(c.entries.find((y) => y.id === x)?.architectId)?.name}</li>)}</ul>
          <p className="small">Each is paid {c.shortlistPay} from your escrow ({picks.length} × {c.shortlistPay}) and has until {fmtDate(c.deadline2)} to develop a full proposal. Everyone else is told they weren’t shortlisted, and keeps their rights.</p>
          {picks.length < c.shortlistSize && <p className="small muted">You planned {c.shortlistSize}. The unused shortlist money is added to the prize.</p>}
          <FormActions>
            <Button onClick={() => setConfirm(false)}>Keep reading</Button>
            <Button variant="primary" onClick={() => { dispatch({ type: 'SET_SHORTLIST', contestId: c.id, ids: picks }); setConfirm(false); window.scrollTo(0, 0); }}>Confirm shortlist</Button>
          </FormActions>
        </Modal>
      )}
    </Page>
  );
}
