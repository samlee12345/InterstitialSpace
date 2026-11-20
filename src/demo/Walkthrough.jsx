// Demo controls › Walkthrough (round 23): the whole life of one space, run live on
// Jawahar Kala Kendra. "Start" removes the kund from the demo data; each step then says
// who does it, opens the right page as the right role, and ticks itself off from the
// demo state. Shortcuts stand in for people who aren't in the room (other reviewers,
// other members, other architects, the platform team).
import { useLocation, useNavigate } from 'react-router-dom';
import { ROLES, useDemo } from '../state/DemoContext.jsx';
import { isJkk } from './jkk.js';

function useJkk() {
  const { state } = useDemo();
  const space = state.spaces.find((s) => isJkk(s) && !s.removed);
  const request = space && (state.contestRequests || []).find((r) => r.spaceId === space.id);
  const contest = space && state.contests.find((c) => c.spaceId === space.id);
  const mod = space && state.moderation.find((m) => m.spaceId === space.id);
  const report = contest && state.updateReports.find((r) => r.contestId === contest.id);
  const mine = contest && contest.entries.find((e) => e.architectId === 'u-a1');
  const live = space && state.comments.filter((c) => c.spaceId === space.id && !c.archived);
  return { state, space, request, contest, mod, report, mine, live };
}

export function Walkthrough({ close }) {
  const { dispatch, role } = useDemo();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { state, space, request, contest, mod, report, mine, live } = useJkk();
  const go = (r, to) => {
    if (r && r !== role) dispatch({ type: 'SET_ROLE', role: r });
    nav(to);
    if (window.matchMedia('(max-width: 64rem)').matches) close();
  };
  const sid = space?.id;
  const cid = contest?.id;
  const others = space ? state.comments.filter((c) => c.spaceId === sid && c.userId !== space.uploadedBy) : [];

  const steps = [
    { id: 'visit', who: 'Visitor', title: 'Opens ReSpace and looks at the map', done: !!space || role !== 'visitor' || pathname !== '/', open: ['visitor', '/'] },
    { id: 'signup', who: 'Visitor', title: 'Signs up as a community member', done: !!space || ['community', 'architect', 'moderator', 'paid'].includes(role), open: ['visitor', '/signup'], tip: 'Sign-up lands on Community member 1.' },
    { id: 'document', who: 'Community member', title: 'Documents the kund', done: !!space, open: ['community', '/space/new'], tip: 'Photos: “Demo · Use the Jawahar Kala Kendra photo”. Questionnaire: “Demo · Fill with Jawahar Kala Kendra details”.' },
    {
      id: 'approve', who: 'Moderator', title: 'Approves it (3 yes votes)', done: space?.status === 'approved', open: sid && ['moderator', `/moderation/${sid}`],
      shortcut: sid && space.status === 'pending' && (mod?.yes || 0) < 2 && ['Two other architects vote yes', () => dispatch({ type: 'DEMO_REVIEWERS_YES', spaceId: sid })],
    },
    { id: 'diagram', who: 'Architect', title: 'Uploads the spatial diagram', done: !!space?.diagrams.some((d) => d.src), open: sid && ['architect', `/space/${sid}/upload-diagram`], tip: 'Files: “Demo · Add sample files” adds the real drawing.' },
    {
      id: 'community', who: 'Other members', title: 'Add experiences; it gets votes to redesign', done: others.length >= 2 && space.votes >= 10, open: sid && ['architect', `/space/${sid}`],
      shortcut: sid && others.length < 3 && ['Three more experiences and 24 votes', () => dispatch({ type: 'DEMO_COMMUNITY', spaceId: sid })],
    },
    { id: 'request', who: 'Local authority (paid account)', title: 'Asks to host a contest', done: !!request || !!contest, open: sid && ['paid', '/contest/request'], tip: 'Pick the kund in “Which space?”, then fill the form or use Fill fields.' },
    {
      id: 'team', who: 'Platform team', title: 'Approves the request; the contest opens', done: !!contest, open: ['paid', '/contributions#hosted'],
      shortcut: request && !contest && ['Team approves the request', () => dispatch({ type: 'APPROVE_CONTEST_REQUEST', id: request.id })],
    },
    {
      id: 'enter', who: 'Architects', title: 'Send round 1 concepts', done: !!mine && (contest?.entries.length || 0) >= 3, open: cid && ['architect', `/contest/${cid}/enter`],
      shortcut: cid && contest.phase === 1 && contest.entries.length < 3 && ['Two other architects enter', () => dispatch({ type: 'DEMO_ENTRIES', contestId: cid })],
    },
    {
      id: 'shortlist', who: 'Local authority', title: 'Round 1 closes; picks the shortlist', done: contest?.phase === 2, open: cid && ['paid', `/contest/${cid}/judge`],
      shortcut: cid && contest.phase === 1 && contest.status === 'live' && ['Skip to the round 1 deadline', () => dispatch({ type: 'END_ROUND_1', contestId: cid })],
    },
    {
      id: 'proposal', who: 'Shortlisted architects', title: 'Hand in full proposals', done: contest?.phase === 2 && contest.status !== 'live', open: cid && ['architect', `/contest/${cid}/enter`],
      tip: 'Architect A’s concept has to be on the shortlist to submit.',
      shortcut: cid && contest.phase === 2 && contest.status === 'live' && (contest.entries.some((e) => contest.shortlist.includes(e.id) && !e.proposal)
        ? ['The rest of the shortlist hands in', () => dispatch({ type: 'DEMO_PROPOSALS', contestId: cid })]
        : ['Skip to the round 2 deadline', () => dispatch({ type: 'END_ROUND_2', contestId: cid })]),
    },
    {
      id: 'winner', who: 'Local authority', title: 'Scores the proposals and picks a winner', done: contest?.status === 'closed', open: cid && ['paid', `/contest/${cid}/judge`],
    },
    { id: 'built', who: 'Local authority', title: 'Builds it, then reports the build', done: !!report, open: cid && ['paid', `/contest/${cid}`] },
    { id: 'confirm', who: 'Moderator', title: 'Confirms: space marked Redesigned, old round archived', done: !!space?.redesigned, open: ['moderator', '/moderation'] },
    { id: 'new', who: 'Community member', title: 'Adds the first experience of the new round', done: !!space?.redesigned && live.length > 0, open: sid && ['community', `/space/${sid}`] },
  ];
  // Confirming the build archives the old round, so earlier steps stay ticked once it's redesigned.
  if (space?.redesigned) steps.forEach((x) => { if (x.id !== 'new') x.done = true; });
  const next = steps.find((x) => !x.done);

  return (
    <div className="stack">
      <section className="stack-sm" aria-labelledby="wt-h">
        <h3 id="wt-h" className="demo-h">Jawahar Kala Kendra, start to finish</h3>
        <p className="xs muted">Documents the kund live, takes it through approval, votes, a contest, the build and a new round. Start removes it from the demo data (and resets everything else).</p>
        <div><button type="button" className="btn" onClick={() => { dispatch({ type: 'JKK_START' }); nav('/'); }}>{state.jkkWalkthrough ? 'Start again' : 'Start the walkthrough'}</button></div>
      </section>
      {state.jkkWalkthrough && (
        <ol className="wt-steps">
          {steps.map((x, i) => (
            <li key={x.id} className={`wt-step ${x.done ? 'wt-done' : ''} ${next === x ? 'wt-next' : ''}`} aria-current={next === x ? 'step' : undefined}>
              <span className="wt-num" aria-hidden="true">{x.done ? '✓' : i + 1}</span>
              <div className="stack-sm grow">
                <span className="small"><span className="bold">{x.who}</span> {x.title.charAt(0).toLowerCase() + x.title.slice(1)}{x.done && <span className="visually-hidden"> (done)</span>}</span>
                {next === x && x.tip && <span className="xs muted">{x.tip}</span>}
                {next === x && (
                  <div className="row">
                    {x.open && <button type="button" className="btn btn-sm" onClick={() => go(...x.open)}>Open as {ROLES.find((r) => r.id === x.open[0])?.label.toLowerCase()}</button>}
                    {x.shortcut && (
                      <button type="button" className="demo-btn demo-btn-inline" onClick={x.shortcut[1]}>
                        <span className="demo-btn-tag" aria-hidden="true">Demo</span> {x.shortcut[0]}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
