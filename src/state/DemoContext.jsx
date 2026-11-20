import { createContext, useContext, useMemo, useReducer } from 'react';
import { useLocation } from 'react-router-dom';
import seed from '../data/seed.json';
import { POINTS, interactPoints, uploadPoints, fmtPoints } from '../lib/points.js';
import { JKK_COMMUNITY, JKK_CONTEST, JKK_DIAGRAM, JKK_DIAGRAM_FILE, JKK_ENTRIES, JKK_EXPERIENCE_PHOTOS, JKK_EXTRA_VOTES, JKK_FIELDS, JKK_NAME, JKK_PHOTO, JKK_POINT, JKK_SHAPE, isJkk } from '../demo/jkk.js';

const plusDays = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const money = (v) => `$${Number(v).toLocaleString('en-US')}`;
// The local authority's contest request for the kund, with the demo brief.
const jkkRequest = (spaceId, size = 5) => ({
  spaceId, brief: JKK_CONTEST.brief, budget: money(JKK_CONTEST.budget), prize: money(JKK_CONTEST.budget - size * JKK_CONTEST.shortlistPay),
  shortlistSize: size, shortlistPay: money(JKK_CONTEST.shortlistPay), deadline: plusDays(42), deadline2: plusDays(98), criteria: JKK_CONTEST.criteria, isPrivate: false,
});

export const ROLES = [
  { id: 'visitor', label: 'Visitor', userId: null },
  { id: 'community', label: 'Community member', userId: 'u-c1' },
  { id: 'architect', label: 'Architect', userId: 'u-a1' },
  { id: 'moderator', label: 'Moderator', userId: 'u-a2' },
  { id: 'paid', label: 'Paid account / co-host', userId: 'u-p1' },
  { id: 'owner', label: 'Private owner', userId: null },
];

const fresh = (role = 'architect') => ({
  ...structuredClone(seed),
  role,
  signupPrompt: null,
  signupDismissed: false,
  failNextPayment: false,
  layout: 'tabs', // space page sections are tabs (decided in round 10)
  introSeen: false, // visitors see "What is an interstitial space?" once per visit
  architectKind: 'licensed', // demo control: the signed-in architect is 'licensed' or a 'student'
  weekSkip: 0, // demo control: pretend this many weeks have passed
  locateFinds: 'new', // demo control: "Use my location" lands on a 'new' place or an 'existing' space
  createGeotag: true, // demo control: photos uploaded in Create new space carry location data
  createNearby: true, // demo control: the photos were taken next to documented spaces
  returnTo: null,
  toasts: [],
  seq: 1,
});

export const WEEK = 7 * 24 * 3600 * 1000;
const today = () => new Date().toISOString().slice(0, 10);
const mapById = (list, id, fn) => list.map((x) => (x.id === id ? fn(x) : x));

const toast = (s, text) => ({ ...s, seq: s.seq + 1, toasts: [...s.toasts, { id: s.seq, text }] });
const notify = (s, to, type, text, link = '/notifications') =>
  to ? { ...s, seq: s.seq + 1, notifications: [{ id: `n-${s.seq}`, to, type, text, link, read: false }, ...s.notifications] } : s;
const award = (s, userId, pts, text) => ({
  ...s,
  seq: s.seq + 1,
  users: mapById(s.users, userId, (u) => ({ ...u, points: u.points + pts, lifetime: u.lifetime + Math.max(pts, 0) })),
  ledger: [{ id: `l-${s.seq}`, userId, text, pts }, ...s.ledger],
});
const ptsWord = () => 'points';
const awardToast = (s, userId, pts, text) => toast(award(s, userId, pts, text), `+${fmtPoints(pts)} ${ptsWord(s, userId)} — ${text}`);

// People added as collaborators on an upload are credited and told about it.
const notifyCollaborators = (s, list, fromId, what, link) => {
  const from = s.users.find((u) => u.id === fromId)?.name;
  return (list || []).filter((c) => c.id).reduce((n, c) => notify(n, c.id, 'points', `${from} added you as a collaborator on ${what}.`, link), s);
};

function reducer(s, a) {
  switch (a.type) {
    case 'SET_ROLE':
      return { ...s, role: a.role, signupPrompt: null };
    case 'RESET':
      return toast(fresh(s.role), 'Demo data reset');
    // ── Jawahar Kala Kendra walkthrough (round 23) ──────────
    // Fresh demo data without the kund, so it can be documented live; starts as an
    // existing community member (round 24: no sign-up step).
    case 'JKK_START': {
      const f = fresh('community');
      const gone = f.spaces.filter(isJkk).map((x) => x.id);
      return toast({
        ...f,
        jkkWalkthrough: true,
        spaces: f.spaces.filter((x) => !gone.includes(x.id)),
        comments: f.comments.filter((c) => !gone.includes(c.spaceId)),
        moderation: f.moderation.filter((m) => !gone.includes(m.spaceId)),
      }, 'Walkthrough started: Jawahar Kala Kendra isn’t on the platform yet');
    }
    // Two other reviewers have voted yes, so the moderator's vote is the third.
    case 'DEMO_REVIEWERS_YES':
      return toast({ ...s, moderation: s.moderation.map((m) => (m.spaceId === a.spaceId ? { ...m, yes: (m.yes || 0) + 2 } : m)) }, 'Two other architects voted yes');
    // Other members post experiences and vote, so the space ranks high.
    case 'DEMO_COMMUNITY': {
      const fresh2 = JKK_COMMUNITY.filter((x) => !s.comments.some((c) => c.spaceId === a.spaceId && c.userId === x.userId && !c.archived));
      const votes = fresh2.filter((x) => x.answers.need >= 6).length + JKK_EXTRA_VOTES;
      // Round 29: each member's experience comes with their photos of the place.
      const photosOf = (x) => (JKK_EXPERIENCE_PHOTOS[x.userId] || []).map((p, j) => ({ id: `${a.spaceId}-${x.userId}-ph${j + 1}`, credit: x.userId, onSite: true, ...p }));
      const n = {
        ...s,
        seq: s.seq + fresh2.length + 1,
        comments: [...s.comments, ...fresh2.map((x, i) => ({ id: `cm-${s.seq + i}`, spaceId: a.spaceId, ...x, photoIds: photosOf(x).map((p) => p.id), date: today() }))],
        spaces: mapById(s.spaces, a.spaceId, (x) => ({ ...x, votes: x.votes + votes, photos: [...x.photos, ...fresh2.flatMap(photosOf).filter((p) => !x.photos.some((q) => q.id === p.id))] })),
      };
      return toast(n, `${fresh2.length} more experiences and ${votes} votes to redesign`);
    }
    // Round 24 fast forward: the kund is approved, an architect has added the real spatial
    // diagram and a 3D model, and other members have posted experiences and votes.
    case 'JKK_FAST_FORWARD': {
      const sp = s.spaces.find((x) => x.id === a.spaceId);
      let n = s;
      if (sp.status !== 'approved') {
        const blank = { spaceId: sp.id, yes: 0, no: 0, voted: [], votes: {}, notes: [], duplicates: [], mergeVotes: 0 };
        const rows = n.moderation.some((m) => m.spaceId === sp.id) ? n.moderation : [...n.moderation, blank];
        n = {
          ...n,
          moderation: rows.map((m) => (m.spaceId === sp.id ? { ...m, yes: Math.max(m.yes || 0, 3) } : m)),
          spaces: mapById(n.spaces, sp.id, (x) => ({ ...x, status: 'approved', qualifiedAwarded: true })),
        };
      }
      if (!sp.diagrams.some((d) => d.src)) {
        const modelId = `m-${n.seq}`;
        const hasModel = n.models.some((m) => m.spaceId === sp.id && !m.takenDown && !m.archived);
        n = {
          ...n,
          seq: n.seq + 1,
          spaces: mapById(n.spaces, sp.id, (x) => ({
            ...x,
            diagrams: [...x.diagrams, { id: `dg-${modelId}`, source: 'architect', by: 'u-a1', collaborators: [], credits: [], date: today(), label: JKK_DIAGRAM.label, src: JKK_DIAGRAM.src, alt: JKK_DIAGRAM.alt }],
            modelUploads: [...(x.modelUploads || []), { id: `mu-${n.seq}`, by: 'u-a1', files: ['kund-scan.obj'], date: today() }],
          })),
          models: hasModel ? n.models : [...n.models, { id: modelId, spaceId: sp.id, title: `3D model — ${sp.name}`, files: ['model.obj'], takenDown: false }],
          diagramUploads: [{ id: modelId, spaceId: sp.id, userId: 'u-a1', date: today(), files: [JKK_DIAGRAM_FILE], notes: '' }, ...n.diagramUploads],
        };
      }
      n = reducer(n, { type: 'DEMO_COMMUNITY', spaceId: sp.id });
      return toast({ ...n, toasts: s.toasts }, 'Fast forward: approved, spatial diagram and 3D model added, experiences and votes in');
    }
    // Round 24: skip past the platform team. Approves the kund's request, or, if the local
    // authority hasn't sent one, opens the contest with the demo brief.
    case 'JKK_SKIP_APPROVAL': {
      let n = s;
      let r = (n.contestRequests || []).find((x) => x.spaceId === a.spaceId);
      if (!r) {
        n = reducer(n, { type: 'REQUEST_CONTEST', userId: 'u-p1', request: jkkRequest(a.spaceId) });
        r = n.contestRequests[0];
      }
      return reducer({ ...n, toasts: s.toasts }, { type: 'APPROVE_CONTEST_REQUEST', id: r.id });
    }
    // Round 28: click a walkthrough step to jump there. Starts over, then plays every
    // earlier step with the same actions the pages and shortcuts use, so the state is
    // what you'd have after doing them by hand. `to` is the step that will be next.
    case 'JKK_JUMP': {
      let n = reducer(s, { type: 'JKK_START' });
      const run = (act) => { n = reducer(n, act); };
      const sid = () => n.spaces.find((x) => isJkk(x) && !x.removed)?.id;
      const con = () => n.contests.find((c) => c.spaceId === sid());
      const entryOf = (who) => con().entries.find((e) => e.architectId === who)?.id;
      const k = a.to;
      if (k >= 1) {
        run({
          type: 'CREATE_SPACE', id: `s-jkk-${n.seq}`, userId: 'u-c1', name: JKK_NAME, spaceType: JKK_FIELDS.type, photos: 1, scans: 0, fields: 5, full: true,
          photoMeta: [{ src: JKK_PHOTO.src, alt: JKK_PHOTO.alt }], lat: JKK_POINT.lat, lng: JKK_POINT.lng, area: JKK_SHAPE, areaM: JKK_SHAPE.r,
          relations: n.spaces.some((x) => x.id === 's17') ? { s17: 'overlap' } : {},
          questionnaire: { feelings: JKK_FIELDS.feelings, transition: JKK_FIELDS.transition, materiality: JKK_FIELDS.materiality.join(', '), sensory: JKK_FIELDS.sensory },
          properties: { activity: JKK_FIELDS.activity, materials: JKK_FIELDS.materiality.join(', '), setting: JKK_FIELDS.materials, climate: 'Not given', authorship: 'Not given' },
        });
      }
      if (k >= 2) { run({ type: 'DEMO_REVIEWERS_YES', spaceId: sid() }); run({ type: 'MOD_VOTE', spaceId: sid(), userId: 'u-a2', yes: true, checks: [] }); }
      if (k >= 3) run({ type: 'JKK_FAST_FORWARD', spaceId: sid() });
      if (k >= 4) run({ type: 'REQUEST_CONTEST', userId: 'u-p1', request: jkkRequest(sid()) });
      if (k >= 5) run({ type: 'JKK_SKIP_APPROVAL', spaceId: sid() });
      if (k >= 6) run({ type: 'JKK_SKIP_TO_ENTRIES', contestId: con().id });
      if (k >= 7) run({ type: 'SET_SHORTLIST', contestId: con().id, ids: [entryOf('u-a1'), entryOf('u-a2')] });
      if (k >= 8) { run({ type: 'DEMO_PROPOSALS', contestId: con().id }); run({ type: 'END_ROUND_2', contestId: con().id }); }
      if (k >= 9) run({ type: 'PICK_WINNER', contestId: con().id, entryId: entryOf('u-a1') });
      if (k >= 10) run({ type: 'CONTEST_BUILT', contestId: con().id });
      if (k >= 11) run({ type: 'REPORT_UPDATE', spaceId: sid(), userId: 'u-c1', photos: 1, contestId: con().id, text: 'The jaali canopy is up over the top steps; the kund is shaded at noon now.' });
      if (k >= 12) run({ type: 'RESOLVE_UPDATE', id: n.updateReports.find((r) => r.contestId === con().id).id, ok: true });
      return toast({ ...n, toasts: [], role: a.role || n.role }, `Jumped to step ${k + 1}`);
    }
    // Round 24: skip to round 1 concepts being in (Architect A's too) and round 1 closed,
    // so the host lands on the shortlist page with every entry in front of them.
    case 'JKK_SKIP_TO_ENTRIES': {
      const c = s.contests.find((x) => x.id === a.contestId);
      let n = s;
      if (!c.entries.some((e) => e.architectId === 'u-a1')) {
        const e = { id: `e-${n.seq}`, architectId: 'u-a1', title: 'Jaali canopy over the upper landing', summary: 'A perforated stone canopy along the north edge that shades the top steps and lets breeze through.', submittedAt: today(), files: ['concept-sheet.pdf'] };
        n = { ...n, seq: n.seq + 1, contests: mapById(n.contests, c.id, (x) => ({ ...x, entries: [...x.entries, e] })) };
      }
      n = reducer(n, { type: 'DEMO_ENTRIES', contestId: c.id });
      n = reducer(n, { type: 'END_ROUND_1', contestId: c.id });
      const count = n.contests.find((x) => x.id === c.id).entries.length;
      return toast({ ...n, toasts: s.toasts }, `${count} round 1 concepts are in and round 1 has closed`);
    }
    // Round 24: the host marks the winning design as built. Anyone can then report the
    // build from the space page; a moderator confirms it.
    case 'CONTEST_BUILT': {
      const c = s.contests.find((x) => x.id === a.contestId);
      const won = c.entries.find((e) => e.id === c.winner);
      let n = { ...s, contests: mapById(s.contests, c.id, (x) => ({ ...x, built: today() })) };
      if (won) n = notify(n, won.architectId, 'contest', `The local authority says your winning design “${won.title}” has been built.`, `/contest/${c.id}`);
      return toast(n, 'Marked as built. Anyone who visits can now report the build on the space page');
    }
    // Other architects send concepts, so the host has entries to shortlist.
    case 'DEMO_ENTRIES': {
      const c = s.contests.find((x) => x.id === a.contestId);
      const add = JKK_ENTRIES.filter((x) => !c.entries.some((e) => e.architectId === x.architectId));
      const entries = add.map((x, i) => ({ id: `e-${s.seq + i}`, ...x, submittedAt: today(), files: ['concept-sheet.pdf'] }));
      return toast({ ...s, seq: s.seq + add.length + 1, contests: mapById(s.contests, a.contestId, (x) => ({ ...x, entries: [...x.entries, ...entries] })) }, `${add.length} more concepts submitted`);
    }
    // The other shortlisted architects hand in their full proposals.
    case 'DEMO_PROPOSALS':
      return toast({
        ...s,
        contests: mapById(s.contests, a.contestId, (x) => ({ ...x, entries: x.entries.map((e) => (x.shortlist.includes(e.id) && !e.proposal ? { ...e, proposal: { files: ['plan.pdf', 'section.pdf', 'view.jpg'], date: today() } } : e)) })),
      }, 'Full proposals received from the rest of the shortlist');
    case 'TOAST':
      return toast(s, a.text);
    case 'TOAST_DONE':
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
    case 'OPEN_SIGNUP':
      return { ...s, signupPrompt: a.reason, returnTo: a.returnTo ?? s.returnTo };
    case 'CLOSE_SIGNUP':
      return { ...s, signupPrompt: null, signupDismissed: true, returnTo: null };
    case 'SIGNUP':
      return toast({ ...s, role: a.kind, signupPrompt: null, signupDismissed: false }, 'Account created — you are signed in');
    case 'SET_FAIL':
      return { ...s, failNextPayment: a.on };
    case 'SET_LAYOUT':
      return { ...s, layout: a.layout };
    case 'SET_CREATE':
      return { ...s, [a.key]: a.value };
    case 'SET_LOCATE':
      return { ...s, locateFinds: a.value };
    case 'SKIP_WEEK':
      return toast({ ...s, weekSkip: s.weekSkip + 1 }, 'Skipped ahead one week');
    case 'CLEAR_RETURN':
      return { ...s, returnTo: null };

    // ── Architect: redesigns ───────────────────────────────
    case 'PUBLISH_REDESIGN': {
      const r = { id: a.id, spaceId: a.spaceId, architectId: a.userId, title: a.title, description: a.description, files: a.files, details: a.details || null, collaborators: a.collaborators || [], version: 1, published: true, takenDown: false, sales: 0, createdAt: Date.now() + s.weekSkip * WEEK };
      let n = { ...s, redesigns: [r, ...s.redesigns] };
      n = awardToast(n, a.userId, POINTS.redesign, 'redesign published');
      n = notifyCollaborators(n, a.collaborators, a.userId, `the redesign “${a.title}”`, `/item/${a.id}`);
      return notify(n, a.userId, 'points', `+5 points for publishing “${a.title}”.`, '/points');
    }
    case 'EDIT_REDESIGN': {
      const before = s.redesigns.find((r) => r.id === a.id);
      let n = { ...s, redesigns: mapById(s.redesigns, a.id, (r) => ({ ...r, ...a.patch, version: r.version + 1 })) };
      s.purchases.filter((p) => p.itemId === a.id).forEach((p) => {
        n = notify(n, p.userId, 'sale', `“${before.title}” has an edited version. Update it from My purchases.`, '/purchases');
      });
      return toast(n, 'Saved — listing updated');
    }
    case 'SET_PUBLISHED':
      return toast(
        { ...s, redesigns: mapById(s.redesigns, a.id, (r) => ({ ...r, published: a.on })) },
        a.on ? 'Published again' : 'Unpublished — buyers keep their copy',
      );

    // ── Architect: spatial diagram ─────────────────────────
    case 'UPLOAD_DIAGRAM': {
      // Spaces can have several diagrams; the one 3D model is regenerated from all of them.
      const sp = s.spaces.find((x) => x.id === a.spaceId);
      const hasModel = s.models.some((m) => m.spaceId === a.spaceId && !m.takenDown && !m.archived);
      let n = {
        ...s,
        spaces: mapById(s.spaces, a.spaceId, (x) => ({ ...x, diagrams: [...x.diagrams, { id: `dg-${a.modelId}`, source: 'architect', by: a.userId, collaborators: a.collaborators || [], credits: [], date: today(), label: a.label || null, ...(a.src ? { src: a.src, alt: a.alt } : {}) }] })),
        models: hasModel ? s.models : [...s.models, { id: a.modelId, spaceId: a.spaceId, title: `3D model — ${sp.name}`, files: ['model.obj'], takenDown: false }],
        diagramUploads: [{ id: a.modelId, spaceId: a.spaceId, userId: a.userId, date: today(), files: a.files, notes: a.notes }, ...s.diagramUploads],
      };
      n = awardToast(n, a.userId, POINTS.diagram, 'spatial diagram added to the Base Library');
      return notifyCollaborators(n, a.collaborators, a.userId, `a spatial diagram of “${sp.name}”`, `/space/${a.spaceId}?tab=diagram`);
    }
    case 'AI_DIAGRAM':
      return {
        ...s,
        spaces: mapById(s.spaces, a.spaceId, (x) =>
          (x.diagrams.length ? x : { ...x, diagrams: [{ id: `dg-ai-${x.id}`, source: 'ai', credits: [...new Set(x.photos.map((p) => p.credit))], date: today() }] })),
      };

    // ── Purchases ──────────────────────────────────────────
    case 'PURCHASE': {
      let n = { ...s, purchases: [a.purchase, ...s.purchases] };
      const { purchase: p } = a;
      if (p.method === 'points') n = award(n, p.userId, -s.config.modelPointsCost, p.kind === 'diagram' ? 'Spatial diagram download' : '3D model download');
      if (p.method === 'free') n = { ...n, users: mapById(n.users, p.userId, (u) => ({ ...u, freeModelsLeft: u.freeModelsLeft - 1 })) };
      if (p.kind === 'redesign') {
        const r = s.redesigns.find((x) => x.id === p.itemId);
        n = { ...n, redesigns: mapById(n.redesigns, p.itemId, (x) => ({ ...x, sales: x.sales + 1 })) };
        n = notify(n, r.architectId, 'sale', `Your redesign “${r.title}” was bought${p.rights === 'full' ? ' with full design rights' : ''}. You earn 80% of ${p.amount}.`, '/earnings');
        // "Connect me with the architect": a message in the platform and (simulated) an email.
        if (p.connect) {
          const buyer = s.users.find((u) => u.id === p.userId);
          n = notify(n, r.architectId, 'sale', `${buyer.name} bought “${r.title}” and wants to work with you to build it. Reply to ${p.email}. (Also sent by email.)`, `/item/${r.id}`);
          n = { ...n, buildRequests: [{ id: `br-${p.id}`, itemId: r.id, architectId: r.architectId, buyerId: p.userId, email: p.email, date: p.date }, ...(n.buildRequests || [])] };
          n = toast(n, `${s.users.find((u) => u.id === r.architectId)?.name} was notified in the platform and by email`);
        }
      }
      return toast(n, 'Purchase confirmed');
    }
    case 'UPDATE_PURCHASE':
      return toast({ ...s, purchases: mapById(s.purchases, a.id, (p) => ({ ...p, version: a.version, title: a.title })) }, 'Updated to the latest version');

    // ── Contests ───────────────────────────────────────────
    case 'SUBMIT_ENTRY': {
      const c = s.contests.find((x) => x.id === a.contestId);
      let n = { ...s, contests: mapById(s.contests, a.contestId, (x) => ({ ...x, entries: [...x.entries, a.entry] })) };
      n = notify(n, a.entry.architectId, 'contest', `Your concept “${a.entry.title}” was received for “${c.title}”. If it’s shortlisted you’ll be paid ${c.shortlistPay} to develop it.`, `/contest/${a.contestId}`);
      n = notifyCollaborators(n, a.entry.collaborators, a.entry.architectId, `the contest entry “${a.entry.title}”`, `/contest/${a.contestId}`);
      return toast(n, a.fee ? `Concept submitted. Entry fee of ${c.entryFee} paid.` : 'Concept submitted');
    }
    // Host a contest: the request goes to the team; nothing else happens until it's approved.
    case 'REQUEST_CONTEST': {
      const r = { id: `cr-${s.seq}`, ...a.request, hostId: a.userId, date: new Date().toISOString(), status: 'review' };
      return toast({ ...s, seq: s.seq + 1, contestRequests: [r, ...(s.contestRequests || [])] }, 'Request sent to the team');
    }
    // The platform team approves a contest request: the contest opens for round 1 (round 23;
    // the team has no screen yet, so this is a Demo shortcut).
    case 'APPROVE_CONTEST_REQUEST': {
      const r = (s.contestRequests || []).find((x) => x.id === a.id);
      if (!r) return s;
      const sp = s.spaces.find((x) => x.id === r.spaceId);
      const host = s.users.find((u) => u.id === r.hostId);
      const criteria = (r.criteria || '').split('\n').map((x) => x.trim()).filter(Boolean);
      const c = {
        id: `c-${s.seq}`, spaceId: r.spaceId, status: 'live', phase: 1,
        title: `Redesign the ${sp?.name || 'space'}`,
        brief: r.brief, prize: r.prize, budget: r.budget, deadline: r.deadline, deadline2: r.deadline2,
        coHost: host?.name, coHostId: r.hostId,
        eligibility: 'Licensed architects and accredited architecture students',
        criteria: criteria.length ? criteria : ['Responds to what residents asked for', 'Buildable within the stated budget', 'Respects the existing structure'],
        entries: [], entryFee: '$25', shortlistSize: r.shortlistSize, shortlistPay: r.shortlistPay, shortlist: [],
      };
      let n = { ...s, seq: s.seq + 1, contests: [c, ...s.contests], contestRequests: s.contestRequests.filter((x) => x.id !== a.id) };
      n = notify(n, r.hostId, 'contest', `The team approved your contest for “${sp?.name}”. It’s open for round 1 concepts; ${r.budget} is held in escrow.`, `/contest/${c.id}`);
      return toast(n, 'Contest approved and open for entries');
    }
    // Demo shortcut: round 1's deadline passes, so the co-host can pick the shortlist (round 23).
    case 'END_ROUND_1':
      return { ...s, contests: mapById(s.contests, a.contestId, (x) => (x.phase === 1 ? { ...x, status: 'judging' } : x)) };
    // Round 1 closes: the co-host's shortlist moves on to round 2 and is paid to develop it.
    case 'SET_SHORTLIST': {
      const c = s.contests.find((x) => x.id === a.contestId);
      // Unused shortlist places go to the prize.
      const num = (v) => Number(String(v).replace(/[^\d]/g, '')) || 0;
      const extra = Math.max(c.shortlistSize - a.ids.length, 0) * num(c.shortlistPay);
      let n = { ...s, contests: mapById(s.contests, a.contestId, (x) => ({ ...x, shortlist: a.ids, phase: 2, status: 'live', prize: extra ? `$${(num(x.prize) + extra).toLocaleString('en-US')}` : x.prize })) };
      c.entries.forEach((e) => {
        n = a.ids.includes(e.id)
          ? notify(n, e.architectId, 'contest', `Your concept “${e.title}” is shortlisted for “${c.title}”. You’ll be paid ${c.shortlistPay} to develop it; full proposals are due ${c.deadline2}.`, `/contest/${c.id}`)
          : notify(n, e.architectId, 'contest', `“${e.title}” wasn’t shortlisted for “${c.title}”. It’s still yours: you can publish it in the Redesign Library.`, `/space/${c.spaceId}/upload-redesign`);
      });
      return toast(n, `Shortlist confirmed. ${a.ids.length} architects are paid ${c.shortlistPay} each to develop their ideas.`);
    }
    // Round 2: a shortlisted architect adds the full proposal to their entry.
    case 'SUBMIT_PROPOSAL':
      return toast({
        ...s,
        contests: mapById(s.contests, a.contestId, (x) => ({ ...x, entries: x.entries.map((e) => (e.id === a.entryId ? { ...e, proposal: a.proposal } : e)) })),
      }, 'Full proposal submitted');
    // Demo shortcut: round 2's deadline passes.
    case 'END_ROUND_2':
      return { ...s, contests: mapById(s.contests, a.contestId, (x) => ({ ...x, status: 'judging', phase: 2 })) };
    // The host's scores and comment on one entry while judging.
    case 'JUDGE_ENTRY':
      return {
        ...s,
        contests: mapById(s.contests, a.contestId, (x) => ({ ...x, review: { ...(x.review || {}), [a.entryId]: { ...(x.review?.[a.entryId] || {}), ...a.patch } } })),
      };
    case 'PICK_WINNER':
      return toast({
        ...s,
        contests: mapById(s.contests, a.contestId, (x) => ({
          ...x,
          status: 'closed',
          winner: a.entryId,
          plans: [
            { when: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), text: 'Winner announced; the co-host bought the design.', done: true },
            { when: 'Next', text: 'The co-host shares its plans for building the design.', done: false },
          ],
        })),
      }, 'Winner picked — prize released from escrow');

    // ── Earnings and notifications ─────────────────────────
    case 'REQUEST_PAYOUT': {
      let n = {
        ...s,
        users: mapById(s.users, a.userId, (u) => ({ ...u, paidOut: (u.paidOut || 0) + a.amount })),
        payouts: [{ id: `po-${s.seq}`, userId: a.userId, amount: a.amount, date: today() }, ...s.payouts],
      };
      n = notify(n, a.userId, 'sale', 'Payout requested. It will reach your bank in 3–5 working days.', '/earnings');
      return toast(n, 'Payout requested');
    }
    case 'READ_ONE':
      return { ...s, notifications: mapById(s.notifications, a.id, (x) => ({ ...x, read: true })) };
    case 'REQUEST_RIGHTS': {
      const r = s.redesigns.find((x) => x.id === a.itemId);
      const n = notify(s, r.architectId, 'sale', `${a.from} asked about full design rights for “${r.title}”: ${a.message}`, `/item/${r.id}`);
      return toast(n, 'Message sent to the architect');
    }
    case 'READ_ALL':
      return { ...s, notifications: s.notifications.map((x) => (x.to === a.userId ? { ...x, read: true } : x)) };

    // ── Community ──────────────────────────────────────────
    case 'ADD_EXPERIENCE': {
      // An experience is a comment plus optional photos; the photos also join the space's gallery.
      // One experience per person per space: posting again updates it (until the space is rebuilt).
      const sp = s.spaces.find((x) => x.id === a.spaceId);
      const ids = Array.from({ length: a.photos }, (_, i) => `${sp.id}-x${s.seq}-${i}`);
      const prev = s.comments.find((c) => c.spaceId === a.spaceId && c.userId === a.userId && !c.archived);
      // Votes to redesign come from experiences: rating the need 6 or more counts as one vote.
      const isVote = (ans) => (ans?.need ?? -1) >= 6;
      const delta = (isVote(a.answers) ? 1 : 0) - (isVote(prev?.answers) ? 1 : 0);
      if (delta) s = { ...s, spaces: mapById(s.spaces, a.spaceId, (x) => ({ ...x, votes: Math.max(0, x.votes + delta) })) };
      if (prev) {
        const n = {
          ...s,
          seq: s.seq + 1,
          comments: s.comments.map((c) => (c === prev ? { ...c, text: a.text, onSite: a.onSite, photoIds: [...(c.photoIds || []), ...ids], answers: a.answers || c.answers, updatedAt: today() } : c)),
          spaces: mapById(s.spaces, a.spaceId, (x) => ({ ...x, photos: [...x.photos, ...ids.map((id) => ({ id, credit: a.userId, onSite: a.onSite }))] })),
        };
        return toast(n, 'Experience updated');
      }
      let n = {
        ...s,
        comments: [...s.comments, { id: `cm-${s.seq}`, spaceId: a.spaceId, userId: a.userId, text: a.text, onSite: a.onSite, photoIds: ids, answers: a.answers || null, date: today() }],
        spaces: mapById(s.spaces, a.spaceId, (x) => ({ ...x, photos: [...x.photos, ...ids.map((id) => ({ id, credit: a.userId, onSite: a.onSite }))] })),
      };
      n = awardToast(n, a.userId, interactPoints(a.onSite), a.onSite ? 'experience posted (on site)' : 'experience posted (off site, half points)');
      // Photo points are only paid once a space has qualified.
      if (a.photos > 0 && sp.status === 'approved') n = award(n, a.userId, uploadPoints({ photos: a.photos, full: a.onSite }), `Photos added: ${sp.name}`);
      return n;
    }
    case 'VOTE_SPACE': {
      const n = { ...s, spaces: mapById(s.spaces, a.spaceId, (x) => ({ ...x, votes: x.votes + 1 })) };
      return awardToast(n, a.userId, interactPoints(a.onSite), a.onSite ? 'vote (on site)' : 'vote (off site, half points)');
    }
    case 'CREATE_SPACE': {
      const sp = {
        id: a.id, name: a.name, type: a.spaceType,
        lat: a.lat ?? 26.9255 + (s.seq % 5) * 0.002, lng: a.lng ?? 75.8205 + (s.seq % 7) * 0.002, city: 'Jaipur', country: 'India', addedAt: today(), areaM: a.areaM || null, area: a.area || null,
        // "The new space is inside this one" → parent. Only one parent.
        parentId: Object.entries(a.relations || {}).find(([, r]) => r === 'parent')?.[0] || null,
        overlaps: Object.entries(a.relations || {}).filter(([, r]) => r === 'overlap').map(([id]) => id),
        status: 'pending', uploadedBy: a.userId, votes: 0,
        photos: Array.from({ length: a.photos }, (_, i) => ({ id: `${a.id}-ph${i + 1}`, credit: a.userId, onSite: a.full, ...(a.photoMeta?.[i] || {}) })),
        questionnaire: a.questionnaire, properties: a.properties, diagrams: [], archive: [], removed: false, removal: null, private: false,
        pendingPoints: uploadPoints({ photos: a.photos, scans: a.scans, fields: a.fields || 0, full: a.full }),
        // Walkthrough: the first space documented after Start is the kund, whatever it's called.
        ...(s.jkkWalkthrough && !s.spaces.some((x) => isJkk(x) && !x.removed) ? { jkk: true } : {}),
      };
      // The uploader's first experience: how it felt, with their photos.
      const first = { id: `cm-${s.seq}`, spaceId: a.id, userId: a.userId, text: a.questionnaire.feelings, onSite: a.full, photoIds: sp.photos.map((p) => p.id), date: today() };
      // "This space is inside the new one" → the existing space gets the new one as parent.
      const children = Object.entries(a.relations || {}).filter(([, r]) => r === 'child').map(([id]) => id);
      const others = s.spaces.map((x) => (children.includes(x.id) ? { ...x, parentId: a.id } : x));
      // pointsFx: the header points badge plays a short "+N pending" animation.
      const n = { ...s, seq: s.seq + 1, pointsFx: { id: s.seq, amount: sp.pendingPoints }, spaces: [sp, ...others], comments: [...s.comments, first], moderation: [...s.moderation, { spaceId: a.id, yes: 0, no: 0, voted: [], votes: {}, notes: [], duplicates: [], mergeVotes: 0 }] };
      return toast(n, 'Submitted — pending qualification');
    }
    case 'MERGE_PHOTOS': {
      // Merging into an existing entry adds an experience: the comment plus the photos.
      const ids = Array.from({ length: a.photos }, (_, i) => `${a.spaceId}-m${s.seq}-${i}`);
      // One experience per person: merging into a space you've posted on updates yours.
      const prev = s.comments.find((c) => c.spaceId === a.spaceId && c.userId === a.userId && !c.archived);
      const n = {
        ...s,
        seq: s.seq + 1,
        comments: prev
          ? s.comments.map((c) => (c === prev ? { ...c, text: a.text, photoIds: [...(c.photoIds || []), ...ids], updatedAt: today() } : c))
          : [...s.comments, { id: `cm-${s.seq}`, spaceId: a.spaceId, userId: a.userId, text: a.text, onSite: a.full, photoIds: ids, date: today() }],
        spaces: mapById(s.spaces, a.spaceId, (x) => ({ ...x, photos: [...x.photos, ...ids.map((id) => ({ id, credit: a.userId, onSite: a.full }))] })),
      };
      return toast(n, 'Experience and photos added to the existing entry');
    }

    // ── Moderation ─────────────────────────────────────────
    // Reviews: each reviewer has one vote per space and can change it. Earlier
    // anonymous seed votes stay in row.yes / row.no.
    case 'MOD_VOTE': {
      const blank = { spaceId: a.spaceId, yes: 0, no: 0, voted: [], votes: {}, notes: [], duplicates: [], mergeVotes: 0 };
      if (!s.moderation.some((m) => m.spaceId === a.spaceId)) s = { ...s, moderation: [...s.moderation, blank] };
      const row = s.moderation.find((m) => m.spaceId === a.spaceId);
      const first = !(row.votes || {})[a.userId] && !row.voted.includes(a.userId);
      const votes = { ...(row.votes || {}), [a.userId]: { vote: a.yes ? 'yes' : 'no', reason: a.reason || '', moveTo: a.moveTo || null, checks: a.checks || [], date: today() } };
      const tally = (v) => (v === 'yes' ? row.yes : row.no) + Object.values(votes).filter((x) => x.vote === v).length;
      const yes = tally('yes');
      const no = tally('no');
      const sp = s.spaces.find((x) => x.id === a.spaceId);
      const status = yes >= 3 ? 'approved' : no >= 3 ? 'rejected' : 'pending';
      let n = {
        ...s,
        moderation: s.moderation.map((m) => (m.spaceId === a.spaceId ? { ...m, votes } : m)),
        users: first ? mapById(s.users, a.userId, (u) => ({ ...u, reviewsThisYear: (u.reviewsThisYear || 0) + 1 })) : s.users,
        spaces: mapById(s.spaces, a.spaceId, (x) => ({
          ...x,
          status,
          rejections: Object.entries(votes).filter(([, v]) => v.vote === 'no').map(([by, v]) => ({ by, reason: v.reason })),
        })),
      };
      n = first ? awardToast(n, a.userId, POINTS.review, 'approval review') : toast(n, 'Your vote was changed');
      if (status === 'approved' && !sp.qualifiedAwarded) {
        const pts = sp.pendingPoints ?? uploadPoints({ photos: sp.photos.filter((p) => p.credit === sp.uploadedBy).length });
        n = award(n, sp.uploadedBy, pts, `Upload qualified: ${sp.name}`);
        n = { ...n, spaces: mapById(n.spaces, a.spaceId, (x) => ({ ...x, qualifiedAwarded: true })) };
        n = notify(n, sp.uploadedBy, 'points', `“${sp.name}” qualified. +${fmtPoints(pts)} points.`, `/space/${a.spaceId}`);
      }
      if (!a.yes) n = notify(n, sp.uploadedBy, 'points', `A reviewer voted that “${sp.name}” does not qualify: ${a.reason} You can appeal or resubmit.`, `/space/${a.spaceId}`);
      return n;
    }
    // Notes reviewers leave for each other on a pending space.
    case 'MOD_NOTE':
      return toast({ ...s, moderation: s.moderation.map((m) => (m.spaceId === a.spaceId ? { ...m, notes: [...(m.notes || []), { by: a.userId, text: a.text, date: today() }] } : m)) }, 'Note added for other reviewers');
    // A moderator declines a pending space that is part of an existing one and
    // moves everything contributed to it onto that space.
    case 'MOD_MOVE': {
      const from = s.spaces.find((x) => x.id === a.spaceId);
      const into = s.spaces.find((x) => x.id === a.intoId);
      let comments = s.comments;
      s.comments.filter((c) => c.spaceId === from.id && !c.archived).forEach((c) => {
        const theirs = comments.find((x) => x.spaceId === into.id && x.userId === c.userId && !x.archived);
        comments = theirs
          ? comments.filter((x) => x !== c).map((x) => (x === theirs ? { ...x, photoIds: [...(x.photoIds || []), ...(c.photoIds || [])], text: `${x.text} ${c.text}` } : x))
          : comments.map((x) => (x === c ? { ...x, spaceId: into.id } : x));
      });
      let n = {
        ...s,
        comments,
        redesigns: s.redesigns.map((r) => (r.spaceId === from.id ? { ...r, spaceId: into.id } : r)),
        spaces: s.spaces.map((x) => {
          if (x.id === from.id) return { ...x, status: 'rejected', movedTo: into.id, photos: [], diagrams: [], votes: 0, rejections: [...(x.rejections || []), { by: a.userId, reason: a.reason }] };
          if (x.id === into.id) return { ...x, photos: [...x.photos, ...from.photos], diagrams: [...x.diagrams, ...from.diagrams], votes: x.votes + from.votes };
          return x;
        }),
      };
      n = notify(n, from.uploadedBy, 'points', `“${from.name}” is part of “${into.name}”, so your photos and experience were moved there. ${a.reason}`, `/space/${into.id}`);
      return toast(n, `Declined — contributions moved to ${into.name}`);
    }
    case 'MOD_MERGE_VOTE':
      return toast(
        { ...s, moderation: s.moderation.map((m) => (m.spaceId === a.spaceId ? { ...m, mergeVotes: m.mergeVotes + 1, mergeVoted: true } : m)) },
        'Marked as the same place',
      );
    case 'FLAG_ITEM':
      return toast({ ...s, flags: [...s.flags, { id: `f-${s.seq}`, itemId: a.itemId, reason: a.reason, status: 'open' }] }, 'Reported — a moderator will check it');
    case 'FLAG_RESOLVE': {
      const f = s.flags.find((x) => x.id === a.id);
      let n = { ...s, flags: mapById(s.flags, a.id, (x) => ({ ...x, status: a.takeDown ? 'taken down' : 'kept' })) };
      if (a.takeDown) {
        n = { ...n, redesigns: mapById(n.redesigns, f.itemId, (r) => ({ ...r, takenDown: true })), models: mapById(n.models, f.itemId, (m) => ({ ...m, takenDown: true })) };
        const r = s.redesigns.find((x) => x.id === f.itemId);
        if (r) n = notify(n, r.architectId, 'removal', `“${r.title}” was taken down after a moderator verified a report.`, '/portfolio');
      }
      return toast(n, a.takeDown ? 'Listing taken down' : 'Report dismissed — listing kept');
    }

    // ── Paid tier, co-op, removal ──────────────────────────
    case 'UPGRADE': {
      // Points stay spendable; only points earned from today count toward the surplus share.
      let n = { ...s, users: mapById(s.users, a.userId, (u) => ({ ...u, paid: true, freeModelsLeft: s.config.paidFreeModels, surplusFrom: u.lifetime })) };
      n = { ...n, seq: n.seq + 1, ledger: [{ id: `l-${n.seq}`, userId: a.userId, text: 'Started the paid tier. Points from today count toward your surplus share.', pts: 0 }, ...n.ledger] };
      return toast(n, 'Paid tier is on. Points from today count toward your surplus share.');
    }
    case 'COOP_VOTE':
      return toast({ ...s, coopDecisions: mapById(s.coopDecisions, a.id, (d) => ({ ...d, votes: { ...d.votes, [a.userId]: a.vote } })) }, 'Vote recorded');
    // ── Reported updates: the space changed on the ground ───
    case 'REPORT_UPDATE': {
      const n = { ...s, seq: s.seq + 1, updateReports: [{ id: `up-${s.seq}`, spaceId: a.spaceId, by: a.userId, date: today(), text: a.text, photos: a.photos, status: 'pending', contestId: a.contestId || null }, ...s.updateReports] };
      return toast(n, a.contestId ? 'Build reported — a moderator will confirm it and mark the space redesigned' : 'Update reported — a moderator will check it');
    }
    case 'RESOLVE_UPDATE': {
      const r = s.updateReports.find((x) => x.id === a.id);
      const sp = s.spaces.find((x) => x.id === r.spaceId);
      let n = { ...s, updateReports: s.updateReports.map((x) => (x.id === a.id ? { ...x, status: a.ok ? 'confirmed' : 'rejected' } : x)) };
      if (a.ok) {
        // Everything contributed so far moves to Archived; the space starts a new round.
        const round = { date: today(), reason: r.text, votes: sp.votes, photos: sp.photos, diagrams: sp.diagrams };
        n = {
          ...n,
          spaces: mapById(n.spaces, sp.id, (x) => ({ ...x, votes: 0, photos: [], diagrams: [], archive: [round, ...(x.archive || [])], updatedAt: today() })),
          comments: n.comments.map((c) => (c.spaceId === sp.id && !c.archived ? { ...c, archived: round.date } : c)),
          redesigns: n.redesigns.map((x) => (x.spaceId === sp.id && !x.archived ? { ...x, archived: round.date } : x)),
          models: n.models.map((m) => (m.spaceId === sp.id && !m.archived ? { ...m, archived: round.date } : m)),
        };
        // Round 23: a build of a contest's winning design marks the space Redesigned.
        const c = r.contestId && s.contests.find((x) => x.id === r.contestId);
        const won = c && c.entries.find((e) => e.id === c.winner);
        if (won) {
          n = {
            ...n,
            spaces: mapById(n.spaces, sp.id, (x) => ({ ...x, redesigned: { date: round.date, contestId: c.id, entryId: won.id, title: won.title, architectId: won.architectId } })),
            contests: mapById(n.contests, c.id, (x) => ({ ...x, plans: [...(x.plans || []).map((p) => ({ ...p, done: true })), { when: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), text: 'Built on site. The space is marked Redesigned and a new round of experiences has started.', done: true }] })),
          };
          n = notify(n, won.architectId, 'contest', `Your winning design “${won.title}” has been built. “${sp.name}” is now marked Redesigned.`, `/space/${sp.id}`);
        }
      }
      n = notify(n, r.by, 'points', a.ok ? `Your update to “${sp.name}” was confirmed. Past contributions are now archived.` : `Your update to “${sp.name}” wasn’t confirmed.`, `/space/${sp.id}`);
      return toast(n, a.ok ? 'Update confirmed — past contributions archived' : 'Update not confirmed');
    }

    case 'SAVE_PROFILE':
      return toast({ ...s, users: mapById(s.users, a.userId, (u) => ({ ...u, city: a.city, country: a.country, links: a.links })) }, 'Profile saved');
    case 'INTRO_SEEN':
      return { ...s, introSeen: true };
    // Someone uploads a model or scan; the one generated model is (re)built from everything.
    case 'UPLOAD_MODEL': {
      const sp = s.spaces.find((x) => x.id === a.spaceId);
      const hasModel = s.models.some((m) => m.spaceId === a.spaceId && !m.takenDown && !m.archived);
      let n = {
        ...s,
        seq: s.seq + 1,
        spaces: mapById(s.spaces, a.spaceId, (x) => ({ ...x, modelUploads: [...(x.modelUploads || []), { id: `mu-${s.seq}`, by: a.userId, files: a.files, date: today() }] })),
        models: hasModel ? s.models : [...s.models, { id: `m-${s.seq}`, spaceId: a.spaceId, title: `3D model — ${sp.name}`, files: ['model.obj'], takenDown: false }],
      };
      n = awardToast(n, a.userId, POINTS.diagram, '3D model uploaded; the space’s model will be rebuilt');
      return n;
    }
    // Architects name who designed a space; a moderator confirms.
    case 'DESIGNER_CLAIM':
      return toast({ ...s, seq: s.seq + 1, designerClaims: [{ id: `dc-${s.seq}`, spaceId: a.spaceId, designer: a.designer, external: a.external || null, by: a.by, note: a.note, date: today(), status: 'pending' }, ...s.designerClaims] }, 'Sent to a moderator to confirm');
    case 'DESIGNER_RESOLVE': {
      const c = s.designerClaims.find((x) => x.id === a.id);
      let n = { ...s, designerClaims: s.designerClaims.map((x) => (x.id === a.id ? { ...x, status: a.ok ? 'confirmed' : 'rejected' } : x)) };
      if (a.ok) n = { ...n, spaces: mapById(n.spaces, c.spaceId, (x) => ({ ...x, designer: c.designer, designerExternal: c.external })) };
      n = notify(n, c.by, 'points', a.ok ? 'Your designer credit was confirmed.' : 'Your designer credit wasn’t confirmed.', `/space/${c.spaceId}`);
      return toast(n, a.ok ? 'Designer confirmed' : 'Designer credit declined');
    }
    case 'SET_ARCHITECT_KIND':
      return { ...s, architectKind: a.kind };

    case 'REMOVAL_REQUEST':
      return toast({ ...s, spaces: mapById(s.spaces, a.spaceId, (x) => ({ ...x, removal: 'review' })) }, 'Removal request sent');
    case 'REMOVAL_RESOLVE': {
      const sp = s.spaces.find((x) => x.id === a.spaceId);
      let n = { ...s, spaces: mapById(s.spaces, a.spaceId, (x) => ({ ...x, removal: a.removed ? 'removed' : 'kept', removed: a.removed })) };
      const who = new Set([sp.uploadedBy, ...sp.photos.map((p) => p.credit)]);
      who.forEach((u) => {
        n = notify(n, u, 'removal', `Removal request for “${sp.name}”: ${a.removed ? 'removed after team review' : 'kept after team review'}.`, '/profile');
      });
      return toast(n, a.removed ? 'Space removed' : 'Space kept');
    }
    default:
      return s;
  }
}

const Ctx = createContext(null);

export function DemoProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => fresh());
  const loc = useLocation();
  const here = loc.pathname + loc.search;
  const value = useMemo(() => {
    const roleDef = ROLES.find((r) => r.id === state.role);
    const user = state.users.find((u) => u.id === roleDef.userId) || null;
    const isArchitect = user?.role === 'architect';
    const get = {
      user: (id) => state.users.find((u) => u.id === id),
      space: (id) => state.spaces.find((x) => x.id === id),
      redesign: (id) => state.redesigns.find((x) => x.id === id),
      model: (id) => state.models.find((x) => x.id === id),
      // Spatial diagrams live on their space; each one is also a Base Library listing.
      diagram: (id) => {
        for (const sp of state.spaces) {
          const d = (sp.diagrams || []).find((x) => x.id === id);
          if (d) return { d, space: sp };
        }
        return null;
      },
      contest: (id) => state.contests.find((x) => x.id === id),
    };
    const architects = state.users.filter((u) => u.role === 'architect').sort((a, b) => b.points - a.points);
    return {
      state, dispatch, user, get, architects,
      role: state.role,
      here, // current in-app address, for returning after sign-up
      layout: state.layout,
      // One redesign per space per architect per week; other spaces stay open.
      uploadLimit: (userId, spaceId) => {
        const now = Date.now() + state.weekSkip * WEEK;
        const last = Math.max(0, ...state.redesigns.filter((r) => r.architectId === userId && r.spaceId === spaceId).map((r) => r.createdAt || 0));
        return { allowed: now >= last + WEEK, next: new Date(last + WEEK) };
      },
      isMember: !!user,
      isArchitect,
      isModerator: state.role === 'moderator',
      isPaid: !!user?.paid,
      cfg: state.config,
      rankOf: (id) => architects.findIndex((u) => u.id === id) + 1,
      visibleSpaces: state.spaces.filter((x) => !x.removed),
      // Returns true if signed in; otherwise opens the sign-up prompt.
      need: (reason) => {
        if (user) return true;
        dispatch({ type: 'OPEN_SIGNUP', reason, returnTo: here });
        return false;
      },
    };
  }, [state, here]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useDemo = () => useContext(Ctx);
