import { createContext, useContext, useMemo, useReducer } from 'react';
import { useLocation } from 'react-router-dom';
import seed from '../data/seed.json';
import { POINTS, interactPoints, uploadPoints, fmtPoints } from '../lib/points.js';

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
// Free members only see ghost points: what they would have collected as paid members.
const ptsWord = (s, userId) => (s.users.find((u) => u.id === userId)?.paid ? 'points' : 'ghost points');
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
        spaces: mapById(s.spaces, a.spaceId, (x) => ({ ...x, diagrams: [...x.diagrams, { id: `dg-${a.modelId}`, source: 'architect', by: a.userId, collaborators: a.collaborators || [], credits: [], date: today(), label: a.label || null }] })),
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
      n = notify(n, a.entry.architectId, 'contest', `Your entry “${a.entry.title}” was received for “${c.title}”.`, `/contest/${a.contestId}`);
      n = notifyCollaborators(n, a.entry.collaborators, a.entry.architectId, `the contest entry “${a.entry.title}”`, `/contest/${a.contestId}`);
      return toast(n, 'Entry submitted');
    }
    // Host a contest: the request goes to the team; nothing else happens until it's approved.
    case 'REQUEST_CONTEST': {
      const r = { id: `cr-${s.seq}`, ...a.request, hostId: a.userId, date: new Date().toISOString(), status: 'review' };
      return toast({ ...s, seq: s.seq + 1, contestRequests: [r, ...(s.contestRequests || [])] }, 'Request sent to the team');
    }
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
        photos: Array.from({ length: a.photos }, (_, i) => ({ id: `${a.id}-ph${i + 1}`, credit: a.userId, onSite: a.full })),
        questionnaire: a.questionnaire, properties: a.properties, diagrams: [], archive: [], removed: false, removal: null, private: false,
        pendingPoints: uploadPoints({ photos: a.photos, scans: a.scans, fields: a.fields || 0, full: a.full }),
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
      // Ghost points stay as history; real points start counting from today.
      const u0 = s.users.find((u) => u.id === a.userId);
      let n = { ...s, users: mapById(s.users, a.userId, (u) => ({ ...u, paid: true, freeModelsLeft: s.config.paidFreeModels, ghostLifetime: u.lifetime, points: 0, lifetime: 0 })) };
      n = { ...n, seq: n.seq + 1, ledger: [{ id: `l-${n.seq}`, userId: a.userId, text: `Started collecting points. ${fmtPoints(u0.points)} ghost points stay as history.`, pts: 0 }, ...n.ledger] };
      return toast(n, 'Paid tier is on. You’re collecting points from today.');
    }
    case 'COOP_VOTE':
      return toast({ ...s, coopDecisions: mapById(s.coopDecisions, a.id, (d) => ({ ...d, votes: { ...d.votes, [a.userId]: a.vote } })) }, 'Vote recorded');
    // ── Reported updates: the space changed on the ground ───
    case 'REPORT_UPDATE': {
      const n = { ...s, seq: s.seq + 1, updateReports: [{ id: `up-${s.seq}`, spaceId: a.spaceId, by: a.userId, date: today(), text: a.text, photos: a.photos, status: 'pending' }, ...s.updateReports] };
      return toast(n, 'Update reported — a moderator will check it');
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
