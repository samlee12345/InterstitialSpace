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
  // The build report: any update reported on the kund after the contest was marked built.
  const report = contest?.built && state.updateReports.find((r) => r.spaceId === space.id && r.date >= contest.built);
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
  // Round 28: jump to any step. Earlier steps are played for you; you land on the map
  // as whoever does that step.
  const jump = (i) => {
    const order = ['document', 'approve', 'grow', 'request', 'team', 'enter', 'shortlist', 'proposal', 'winner', 'built', 'report', 'confirm', 'new'];
    const as = { document: 'community', approve: 'moderator', grow: 'architect', request: 'paid', team: 'paid', enter: 'architect', shortlist: 'paid', proposal: 'architect', winner: 'paid', built: 'paid', report: 'community', confirm: 'moderator', new: 'community' }[order[i]];
    dispatch({ type: 'JKK_JUMP', to: i, role: as });
    nav('/');
  };
  const sid = space?.id;
  const cid = contest?.id;
  const others = space ? state.comments.filter((c) => c.spaceId === sid && c.userId !== space.uploadedBy) : [];

  const roleLabel = (r) => ({ community: 'community member', architect: 'architect', moderator: 'moderator', paid: 'local authority' }[r] || ROLES.find((x) => x.id === r)?.label.toLowerCase());
  // Each step: who, what, when it's done, and its buttons. `as` is the role the
  // "Switch to … user" button signs in as (it lands on the map); `actions` are extra buttons ({ label, run, demo } — demo ones stand in for
  // people who aren't in the room).
  // Fast forward: approved, diagram + 3D model in, experiences and votes in.
  const fastForward = sid && { label: 'Fast forward', run: () => { dispatch({ type: 'JKK_FAST_FORWARD', spaceId: sid }); go('community', `/space/${sid}?tab=experience`); }, demo: true };
  const steps = [
    { id: 'document', who: 'Community member', title: 'Documents the amphitheatre', done: !!space, as: 'community' },
    {
      id: 'approve', who: 'Moderator', title: 'Approves it (3 yes votes)', done: space?.status === 'approved', as: 'moderator',
      actions: [sid && space.status === 'pending' && (mod?.yes || 0) < 2 && { label: 'Two other architects vote yes', run: () => dispatch({ type: 'DEMO_REVIEWERS_YES', spaceId: sid }), demo: true }, sid && fastForward],
    },
    {
      id: 'grow', who: 'Other members', title: 'Add experiences and vote for an upgrade; the AI builds the Base Library',
      done: !!space?.diagrams.some((d) => d.source === 'ai') && others.length >= 2 && space.votes >= 10, as: 'architect',
      actions: [sid && { label: 'Other members add their experiences', run: () => { dispatch({ type: 'DEMO_COMMUNITY', spaceId: sid }); go('community', `/space/${sid}?tab=experience`); }, demo: true }],
    },
    {
      id: 'request', who: 'Local authority (paid account)', title: 'Asks to host a contest', done: !!request || !!contest, as: 'paid',
    },
    {
      id: 'team', who: 'Platform team', title: 'Approves the request; the contest opens', done: !!contest, as: 'paid',
      actions: [sid && !contest && { label: 'Skip past approval', run: () => { dispatch({ type: 'JKK_SKIP_APPROVAL', spaceId: sid }); go('paid', '/contributions#hosted'); }, demo: true }],
    },
    {
      id: 'enter', who: 'Architects', title: 'Send round 1 concepts', done: !!mine && (contest?.entries.length || 0) >= 3, as: 'architect',
      actions: [cid && contest.phase === 1 && { label: 'Skip to the entries (as the host)', run: () => { dispatch({ type: 'JKK_SKIP_TO_ENTRIES', contestId: cid }); go('paid', '/'); }, demo: true }],
    },
    {
      id: 'shortlist', who: 'Local authority', title: 'Round 1 closes; picks the shortlist', done: contest?.phase === 2, as: 'paid',
      actions: [cid && contest.phase === 1 && contest.status === 'live' && { label: 'Skip to the round 1 deadline', run: () => dispatch({ type: 'END_ROUND_1', contestId: cid }), demo: true }],
    },
    {
      id: 'proposal', who: 'Shortlisted architects', title: 'Hand in full proposals', done: contest?.phase === 2 && contest.status !== 'live', as: 'architect',
      actions: [cid && contest.phase === 2 && contest.status === 'live' && (contest.entries.some((e) => contest.shortlist.includes(e.id) && !e.proposal)
        ? { label: 'The rest of the shortlist hands in (as the host)', run: () => { dispatch({ type: 'DEMO_PROPOSALS', contestId: cid }); go('paid', `/contest/${cid}/judge`); }, demo: true }
        : { label: 'Skip to the round 2 deadline (as the host)', run: () => { dispatch({ type: 'END_ROUND_2', contestId: cid }); go('paid', `/contest/${cid}/judge`); }, demo: true })],
    },
    { id: 'winner', who: 'Local authority', title: 'Scores the proposals and picks a winner', done: contest?.status === 'closed', as: 'paid' },
    {
      id: 'built', who: 'Local authority', title: 'Builds it', done: !!contest?.built || !!report, as: 'paid',
      actions: [cid && contest.status === 'closed' && { label: 'It’s built', run: () => dispatch({ type: 'CONTEST_BUILT', contestId: cid }), demo: true }],
    },
    {
      id: 'report', who: 'Community member', title: 'Visits and reports the build', done: !!report, as: 'community' },
    { id: 'confirm', who: 'Moderator', title: 'Confirms: space marked Redesigned, old round archived', done: !!space?.redesigned, as: 'moderator' },
    { id: 'new', who: 'Community member', title: 'Adds the first experience of the new round', done: !!space?.redesigned && live.length > 0, as: 'community' },
  ];
  // Round 26: "Switch to … user" changes role and goes to the landing page; the tip says
  // where to go from there, so the demo is clicked through like a real visit.
  const TIPS = {
    document: 'From the map: search “Jawahar” (nothing there yet), then “Add this place”. Photos: “Demo · Use the Jawahar Kala Kendra photo”. Questionnaire: “Demo · Fill with Jawahar Kala Kendra details”.',
    approve: 'Header › Approvals, then Review on the amphitheatre’s row.',
    grow: 'Open the amphitheatre (search “Jawahar” on the map), then Add your experience; you can attach a drawing to it. With the other members’ photos the AI draws the spatial diagram and 3D model in the Base Library tab.',
    request: 'Account menu › Host a contest. Pick the amphitheatre, then fill the form or use Fill fields.',
    team: 'Account menu › Contributions › Hosted contests shows the request under team review.',
    enter: 'Contests › Redesign the Amphitheatre… › Submit an entry.',
    shortlist: 'Account menu › Contributions (“to judge”) › Hosted contests › Ready to judge.',
    proposal: 'Contests › the amphitheatre’s contest › Submit your full proposal. Architect A’s concept has to be on the shortlist.',
    winner: 'Account menu › Contributions › Hosted contests › Ready to judge.',
    built: 'Account menu › Contributions › Hosted contests › the contest, then “Mark as built”.',
    report: 'Open the amphitheatre (search “Jawahar” on the map), then Options › Report an update and say what changed.',
    confirm: 'Header › Approvals, then Review on the amphitheatre’s Reported update row. Answer “Is this the build…?” and confirm. One moderator decides.',
    new: 'Open the amphitheatre, then Add your experience.',
  };
  steps.forEach((x) => { x.tip = TIPS[x.id]; });
  // Confirming the build archives the old round, so earlier steps stay ticked once it's redesigned.
  if (space?.redesigned) steps.forEach((x) => { if (x.id !== 'new') x.done = true; });
  const next = steps.find((x) => !x.done);

  return (
    <div className="stack">
      <section className="stack-sm" aria-labelledby="wt-h">
        <h3 id="wt-h" className="demo-h">Jawahar Kala Kendra, start to finish</h3>
        <p className="xs muted">Documents the amphitheatre live, takes it through approval, votes, a contest, the build and a new round. Start removes it from the demo data, resets everything else and signs you in as Community member 1. Select any step to jump there.</p>
        <div><button type="button" className="btn" onClick={() => { dispatch({ type: 'JKK_START' }); nav('/'); }}>{state.jkkWalkthrough ? 'Start again' : 'Start the walkthrough'}</button></div>
      </section>
      {state.jkkWalkthrough && (
        <ol className="wt-steps">
          {steps.map((x, i) => (
            <li key={x.id} className={`wt-step ${x.done ? 'wt-done' : ''} ${next === x ? 'wt-next' : ''}`} aria-current={next === x ? 'step' : undefined}>
              <span className="wt-num" aria-hidden="true">{x.done ? '✓' : i + 1}</span>
              <div className="stack-sm grow">
                {next === x ? (
                  <span className="small"><span className="bold">{x.who}</span> {x.title.charAt(0).toLowerCase() + x.title.slice(1)}</span>
                ) : (
                  <button type="button" className="wt-jump small" onClick={() => jump(i)} title="Jump here: earlier steps are done for you">
                    <span className="bold">{x.who}</span> {x.title.charAt(0).toLowerCase() + x.title.slice(1)}
                    <span className="visually-hidden">{x.done ? ' (done)' : ''}. Jump to this step</span>
                  </button>
                )}
                {next === x && x.tip && <span className="xs muted">{x.tip}</span>}
                {next === x && (
                  <div className="row">
                    {x.as && <button type="button" className="btn btn-sm" onClick={() => go(x.as, '/')}>Switch to {roleLabel(x.as)} user</button>}
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
