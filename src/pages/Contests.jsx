import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Badge, Button, Choice, Empty, FileDrop, FormActions, ImageBox, Input, Mine, Page, RoleGate, Select, Steps } from '../components/ui.jsx';
import { ContestCard, ContestPlans, Crumbs, contestWinner } from '../components/domain.jsx';

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
  const { get, dispatch, user, isArchitect, isMember, cfg } = useDemo();
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
            <h2>Entries ({c.entries.length})</h2>
            {isMember ? (
              <ul className="entries small">
                {c.entries.map((e) => (
                  <li key={e.id}>
                    <span className="row">
                      <span className="bold">{e.title}</span>
                      <Mine userId={e.architectId} />
                      {c.winner === e.id && <Badge kind="solid">Winner</Badge>}
                    </span>
                    <span className="muted">by {get.user(e.architectId)?.name}. Submitted {fmtDate(e.submittedAt)}</span>
                  </li>
                ))}
                {c.entries.length === 0 && <li className="muted">No entries yet.</li>}
              </ul>
            ) : <p className="small muted">Sign up to see the entries.</p>}
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
            <dt>Eligibility</dt><dd>{c.eligibility}</dd>
            <dt>Entries</dt><dd>{c.entries.length}</dd>
          </dl>
          {c.status !== 'live' ? (
            <p className="small muted">{c.status === 'judging' ? 'Entries are closed. The co-host is judging.' : 'This contest is closed.'}</p>
          ) : mine ? (
            <p className="small bold">You entered “{mine.title}”.</p>
          ) : isArchitect ? (
            <Button variant="primary" to={`/space/${c.spaceId}/upload-redesign?contest=${c.id}`}>Submit an entry</Button>
          ) : (
            <p className="small muted">{isMember ? 'Only architects can enter contests.' : 'Sign up as an architect to enter.'}</p>
          )}
        </aside>
      </div>
    </Page>
  );
}

const REQ_STEPS = ['Request', 'Team review', 'Judging', 'Prize and payment'];

export function ContestRequest() {
  const { state, dispatch, isPaid, cfg, get } = useDemo();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ spaceId: 's1', isPrivate: 'no', deed: [], brief: '', prize: '', criteria: '' });
  const [err, setErr] = useState('');
  const judging = state.contests.find((c) => c.id === 'c2');
  const [scores, setScores] = useState({});
  const [winner, setWinner] = useState(judging?.winner || null);
  if (!isPaid) return <Page narrow tag="simulated"><RoleGate title="Hosting a contest needs a paid account">Paid accounts (authorities, NGOs, owners, resident groups) can request to host.</RoleGate><div><Button to="/points">See the paid tier</Button></div></Page>;

  const send = () => {
    if (!f.brief.trim() || !f.prize.trim()) return setErr('Add a brief and a prize.');
    if (f.isPrivate === 'yes' && f.deed.length === 0) return setErr('A private space needs its owner as co-host. Upload the deed so the team can verify it.');
    setErr('');
    dispatch({ type: 'TOAST', text: 'Request sent to the team' });
    return setStep(1);
  };

  return (
    <Page narrow tag="simulated">
      <h1>Host a contest</h1>
      <Steps steps={REQ_STEPS} current={step} />

      {step === 0 && (
        <div className="stack">
          <Select label="Which space?" value={f.spaceId} onChange={(e) => setF({ ...f, spaceId: e.target.value })} options={state.spaces.filter((s) => !s.removed && s.status === 'approved').map((s) => ({ value: s.id, label: `${s.name} (${s.votes} votes)` }))} />
          <div className="field">
            <span className="label">Is this a private space?</span>
            <Choice name="priv" checked={f.isPrivate === 'no'} onChange={() => setF({ ...f, isPrivate: 'no' })} title="No, it is public" />
            <Choice name="priv" checked={f.isPrivate === 'yes'} onChange={() => setF({ ...f, isPrivate: 'yes' })} title="Yes, it is privately owned">The owner must co-host, and the team verifies the deed.</Choice>
          </div>
          {f.isPrivate === 'yes' && <FileDrop label="Deed or other proof of ownership" files={f.deed} onChange={(deed) => setF({ ...f, deed })} samples={['deed-scan.pdf']} />}
          <Input label="Brief" textarea value={f.brief} onChange={(e) => setF({ ...f, brief: e.target.value })} />
          <Input label="Prize you will fund" value={f.prize} onChange={(e) => setF({ ...f, prize: e.target.value })} placeholder="$X,XXX" />
          <Input label="Judging criteria (you set these, and you judge)" textarea value={f.criteria} onChange={(e) => setF({ ...f, criteria: e.target.value })} />
          {err && <span className="error" role="alert">{err}</span>}
          <FormActions><Button variant="primary" onClick={send}>Send request</Button></FormActions>
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          <div className="alert">
            <h2>Under manual team review</h2>
            <p>The team looks at each request case by case. {f.isPrivate === 'yes' ? 'Deed received; ownership is being verified.' : ''} You’ll get a notification when it is approved.</p>
          </div>
          <p className="note">Simulated from here: skip ahead to a contest of yours whose deadline has passed.</p>
          <div><Button variant="primary" onClick={() => setStep(2)}>Skip ahead to judging</Button></div>
        </div>
      )}

      {step === 2 && judging && (
        <div className="stack">
          <h2>Judge: {judging.title}</h2>
          <p className="muted small">Score each entry against your criteria, then pick a winner.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Entry</th>{judging.criteria.map((c) => <th key={c}>{c}</th>)}<th>Winner</th></tr></thead>
              <tbody>
                {judging.entries.map((e) => (
                  <tr key={e.id}>
                    <td><span className="bold">{e.title}</span><br /><span className="muted">{get.user(e.architectId)?.name}</span></td>
                    {judging.criteria.map((c) => (
                      <td key={c}>
                        <select className="input" aria-label={`${e.title}: ${c}`} value={scores[e.id + c] || '3'} onChange={(ev) => setScores({ ...scores, [e.id + c]: ev.target.value })}>
                          {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
                        </select>
                      </td>
                    ))}
                    <td><input type="radio" name="winner" aria-label={`Pick ${e.title}`} checked={winner === e.id} onChange={() => setWinner(e.id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <Button
              variant="primary"
              disabled={!winner}
              onClick={() => {
                dispatch({ type: 'PICK_WINNER', contestId: judging.id, entryId: winner });
                setStep(3);
              }}
            >
              Confirm winner
            </Button>
          </div>
        </div>
      )}

      {step === 3 && judging && (
        <div className="stack">
          <div className="alert">
            <h2>Prize released from escrow</h2>
            <p>Your prize was held in escrow when the contest opened. It is now paid out.</p>
          </div>
          <div className="card">
            <h3>Payment summary</h3>
            <dl className="dl">
              <dt>Winner</dt><dd>{judging.entries.find((e) => e.id === winner)?.title} by {get.user(judging.entries.find((e) => e.id === winner)?.architectId)?.name}</dd>
              <dt>Prize in escrow</dt><dd>{judging.prize}</dd>
              <dt>Winner receives</dt><dd>The full prize</dd>
              <dt>Design</dt><dd>Sold to you as co-host, at the price you set</dd>
            </dl>
          </div>
          <div className="row"><Button to="/contests">Back to contests</Button><Button variant="quiet" onClick={() => setStep(0)}>Start another request</Button></div>
        </div>
      )}
    </Page>
  );
}
