// Demo controls › Walkthrough (round 23; round 24 starts as an existing member, folds the
// diagram and community steps into one with a fast forward, adds skips for the contest
// steps, and splits the build from the report): the whole life of one space, run live on
// Jawahar Kala Kendra. "Start" removes the kund from the demo data; each step then says
// who does it, opens the right page as the right role, and ticks itself off from the
// demo state. Shortcuts stand in for people who aren't in the room (other reviewers,
// other members, other architects, the platform team).
import { useNavigate } from 'react-router-dom';
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
    const { state, space, request, contest, mod, report, mine, live } = useJkk();
  const go = (r, to) => {
    if (r && r !== role) dispatch({ type: 'SET_ROLE', role: r });
    nav(to);
    if (window.matchMedia('(max-width: 64rem)').matches) close();
  };
  const sid = space?.id;
  const cid = contest?.id;
  const others = space ? state.comments.filter((c) => c.spaceId === sid && c.userId !== space.uploadedBy) : [];

  const roleLabel = (r) => ROLES.find((x) => x.id === r)?.label.toLowerCase();
  // Each step: who, what, when it's done, and its buttons. `open` is the plain "Open as …"
  // button; `actions` are extra buttons ({ label, run, demo } — demo ones stand in for
  // people who aren't in the room).
  // Fast forward: approved, diagram + 3D model in, experiences and votes in.
  const fastForward = sid && { label: 'Fast forward', run: () => { dispatch({ type: 'JKK_FAST_FORWARD', spaceId: sid }); go('community', `/space/${sid}?tab=diagram`); }, demo: true };
  const steps = [
    { id: 'document', who: 'Community member', title: 'Documents the kund', done: !!space, open: ['community', '/space/new'], tip: 'You’re signed in as Community member 1. Photos: “Demo · Use the Jawahar Kala Kendra photo”. Questionnaire: “Demo · Fill with Jawahar Kala Kendra details”.' },
    {
      id: 'approve', who: 'Moderator', title: 'Approves it (3 yes votes)', done: space?.status === 'approved', open: sid && ['moderator', `/moderation/${sid}`],
      actions: [sid && space.status === 'pending' && (mod?.yes || 0) < 2 && { label: 'Two other architects vote yes', run: () => dispatch({ type: 'DEMO_REVIEWERS_YES', spaceId: sid }), demo: true }, sid && fastForward],
    },
    {
      id: 'grow', who: 'Architects and other members', title: 'Add the spatial diagram and 3D model, post experiences and vote to redesign',
      done: !!space?.diagrams.some((d) => d.src) && others.length >= 2 && space.votes >= 10, open: sid && ['architect', `/space/${sid}/upload-diagram`],
      tip: 'To do it live: the diagram form’s “Demo · Add sample files” adds the real drawing. Or fast forward to the space with it all in place.',
      actions: [sid && fastForward],
    },
    {
      id: 'request', who: 'Local authority (paid account)', title: 'Asks to host a contest', done: !!request || !!contest,
      tip: 'The form opens with the kund picked. Fill it, or use Fill fields.',
      actions: [sid && { label: role === 'paid' ? 'Open the request form' : 'Switch to local authority user', run: () => go('paid', `/contest/request?space=${sid}`) }],
    },
    {
      id: 'team', who: 'Platform team', title: 'Approves the request; the contest opens', done: !!contest, open: request && ['paid', '/contributions#hosted'],
      tip: request ? null : 'No request yet: skipping opens the contest with the demo brief.',
      actions: [sid && !contest && { label: 'Skip past approval', run: () => { dispatch({ type: 'JKK_SKIP_APPROVAL', spaceId: sid }); go('paid', '/contributions#hosted'); }, demo: true }],
    },
    {
      id: 'enter', who: 'Architects', title: 'Send round 1 concepts', done: !!mine && (contest?.entries.length || 0) >= 3, open: cid && ['architect', `/contest/${cid}/enter`],
      actions: [cid && contest.phase === 1 && { label: 'Skip to the entries (as the host)', run: () => { dispatch({ type: 'JKK_SKIP_TO_ENTRIES', contestId: cid }); go('paid', `/contest/${cid}/judge`); }, demo: true }],
    },
    {
      id: 'shortlist', who: 'Local authority', title: 'Round 1 closes; picks the shortlist', done: contest?.phase === 2, open: cid && ['paid', `/contest/${cid}/judge`],
      actions: [cid && contest.phase === 1 && contest.status === 'live' && { label: 'Skip to the round 1 deadline', run: () => dispatch({ type: 'END_ROUND_1', contestId: cid }), demo: true }],
    },
    {
      id: 'proposal', who: 'Shortlisted architects', title: 'Hand in full proposals', done: contest?.phase === 2 && contest.status !== 'live', open: cid && ['architect', `/contest/${cid}/enter`],
      tip: 'Architect A’s concept has to be on the shortlist to submit.',
      actions: [cid && contest.phase === 2 && contest.status === 'live' && (contest.entries.some((e) => contest.shortlist.includes(e.id) && !e.proposal)
        ? { label: 'The rest of the shortlist hands in', run: () => dispatch({ type: 'DEMO_PROPOSALS', contestId: cid }), demo: true }
        : { label: 'Skip to the round 2 deadline', run: () => dispatch({ type: 'END_ROUND_2', contestId: cid }), demo: true })],
    },
    { id: 'winner', who: 'Local authority', title: 'Scores the proposals and picks a winner', done: contest?.status === 'closed', open: cid && ['paid', `/contest/${cid}/judge`] },
    {
      id: 'built', who: 'Local authority', title: 'Builds it', done: !!contest?.built || !!report, open: cid && ['paid', `/contest/${cid}`],
      tip: 'On the contest page: “Mark as built”.',
      actions: [cid && contest.status === 'closed' && { label: 'It’s built', run: () => dispatch({ type: 'CONTEST_BUILT', contestId: cid }), demo: true }],
    },
    {
      id: 'report', who: 'Community member', title: 'Visits and reports the build', done: !!report, open: sid && ['community', `/space/${sid}`],
      tip: 'On the space page: Options › Report an update. “This is the build of …” is already ticked.',
    },
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
        <p className="xs muted">Documents the kund live, takes it through approval, votes, a contest, the build and a new round. Start removes it from the demo data, resets everything else and signs you in as Community member 1.</p>
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
                    {x.open && <button type="button" className="btn btn-sm" onClick={() => go(...x.open)}>Open as {roleLabel(x.open[0])}</button>}
                    {(x.actions || []).filter(Boolean).map((b) => (b.demo ? (
                      <button key={b.label} type="button" className="demo-btn demo-btn-inline" onClick={b.run}>
                        <span className="demo-btn-tag" aria-hidden="true">Demo</span> {b.label}
                      </button>
                    ) : (
                      <button key={b.label} type="button" className="btn btn-sm" onClick={b.run}>{b.label}</button>
                    )))}
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
