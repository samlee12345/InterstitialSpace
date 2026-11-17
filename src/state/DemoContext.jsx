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
  layout: 'single', // space page: 'single' (everything on one page) or 'tabs'
  weekSkip: 0, // demo control: pretend this many weeks have passed
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
const awardToast = (s, userId, pts, text) => toast(award(s, userId, pts, text), `+${fmtPoints(pts)} points — ${text}`);

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
    case 'SKIP_WEEK':
      return toast({ ...s, weekSkip: s.weekSkip + 1 }, 'Skipped ahead one week');
    case 'CLEAR_RETURN':
      return { ...s, returnTo: null };

    // ── Architect: redesigns ───────────────────────────────
    case 'PUBLISH_REDESIGN': {
      const r = { id: a.id, spaceId: a.spaceId, architectId: a.userId, title: a.title, description: a.description, files: a.files, version: 1, published: true, takenDown: false, sales: 0, createdAt: Date.now() + s.weekSkip * WEEK };
      let n = { ...s, redesigns: [r, ...s.redesigns] };
      n = awardToast(n, a.userId, POINTS.redesign, 'redesign published');
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
      const sp = s.spaces.find((x) => x.id === a.spaceId);
      const ready = sp.status === 'pending' && sp.photos.length >= s.config.manualDiagramMinPhotos;
      let n = {
        ...s,
        spaces: mapById(s.spaces, a.spaceId, (x) => ({ ...x, diagram: { source: 'architect', by: a.userId, credits: [] }, readyForApproval: ready })),
        models: [...s.models, { id: a.modelId, spaceId: a.spaceId, title: `Measured model — ${sp.name}`, files: a.files, takenDown: false }],
        diagramUploads: [{ id: a.modelId, spaceId: a.spaceId, userId: a.userId, date: today() }, ...s.diagramUploads],
      };
      n = awardToast(n, a.userId, POINTS.diagram, 'spatial diagram added to the Base Library');
      if (ready) n = notify(n, sp.uploadedBy, 'points', `“${sp.name}” now has a spatial diagram and is ready for approval.`, `/space/${a.spaceId}`);
      return n;
    }
    case 'AI_DIAGRAM':
      return {
        ...s,
        spaces: mapById(s.spaces, a.spaceId, (x) =>
          x.diagram ? x : { ...x, diagram: { source: 'ai', credits: [...new Set(x.photos.map((p) => p.credit))] }, readyForApproval: x.status === 'pending' }),
      };

    // ── Purchases ──────────────────────────────────────────
    case 'PURCHASE': {
      let n = { ...s, purchases: [a.purchase, ...s.purchases] };
      const { purchase: p } = a;
      if (p.method === 'points') n = award(n, p.userId, -s.config.modelPointsCost, 'Measured model download');
      if (p.method === 'free') n = { ...n, users: mapById(n.users, p.userId, (u) => ({ ...u, freeModelsLeft: u.freeModelsLeft - 1 })) };
      if (p.kind === 'redesign') {
        const r = s.redesigns.find((x) => x.id === p.itemId);
        n = { ...n, redesigns: mapById(n.redesigns, p.itemId, (x) => ({ ...x, sales: x.sales + 1 })) };
        n = notify(n, r.architectId, 'sale', `Your redesign “${r.title}” was bought. You earn 80% of ${p.amount}.`, '/earnings');
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
      return toast(n, 'Entry submitted');
    }
    case 'PICK_WINNER':
      return toast({ ...s, contests: mapById(s.contests, a.contestId, (x) => ({ ...x, status: 'closed', winner: a.entryId })) }, 'Winner picked — prize released from escrow');

    // ── Earnings and notifications ─────────────────────────
    case 'REQUEST_PAYOUT': {
      let n = {
        ...s,
        users: mapById(s.users, a.userId, (u) => ({ ...u, paidOut: (u.paidOut || 0) + a.amount })),
        payouts: [{ id: `po-${s.seq}`, userId: a.userId, amount: a.amount, date: today() }, ...s.payouts],
      };
      n = notify(n, a.userId, 'sale', 'Payout requested. It will reach your bank in 3–5 working days (simulated).', '/earnings');
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
      const sp = s.spaces.find((x) => x.id === a.spaceId);
      let n = {
        ...s,
        comments: [...s.comments, { id: `cm-${s.seq}`, spaceId: a.spaceId, userId: a.userId, text: a.text, onSite: a.onSite, photos: a.photos }],
        spaces: mapById(s.spaces, a.spaceId, (x) => ({
          ...x,
          photos: [...x.photos, ...Array.from({ length: a.photos }, (_, i) => ({ id: `${x.id}-x${s.seq}-${i}`, credit: a.userId, onSite: a.onSite }))],
        })),
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
        id: a.id, name: a.name, type: a.spaceType, lat: 26.9255 + (s.seq % 5) * 0.002, lng: 75.8205 + (s.seq % 7) * 0.002,
        status: 'pending', readyForApproval: false, uploadedBy: a.userId, votes: 0,
        photos: Array.from({ length: a.photos }, (_, i) => ({ id: `${a.id}-ph${i + 1}`, credit: a.userId, onSite: a.full })),
        questionnaire: a.questionnaire, properties: a.properties, diagram: null, removed: false, removal: null, private: false,
        pendingPoints: uploadPoints({ photos: a.photos, scans: a.scans, full: a.full }),
      };
      const n = { ...s, spaces: [sp, ...s.spaces], moderation: [...s.moderation, { spaceId: a.id, yes: 0, no: 0, voted: [], duplicates: [], mergeVotes: 0 }] };
      return toast(n, 'Submitted — pending qualification');
    }
    case 'MERGE_PHOTOS': {
      const n = {
        ...s,
        spaces: mapById(s.spaces, a.spaceId, (x) => ({
          ...x,
          photos: [...x.photos, ...Array.from({ length: a.photos }, (_, i) => ({ id: `${x.id}-m${s.seq}-${i}`, credit: a.userId, onSite: a.full }))],
        })),
      };
      return toast(n, 'Photos added to the existing entry');
    }

    // ── Moderation ─────────────────────────────────────────
    case 'MOD_VOTE': {
      const row = s.moderation.find((m) => m.spaceId === a.spaceId);
      const yes = row.yes + (a.yes ? 1 : 0);
      const no = row.no + (a.yes ? 0 : 1);
      const sp = s.spaces.find((x) => x.id === a.spaceId);
      let n = {
        ...s,
        moderation: s.moderation.map((m) => (m.spaceId === a.spaceId ? { ...m, yes, no, voted: [...m.voted, a.userId] } : m)),
        users: mapById(s.users, a.userId, (u) => ({ ...u, reviewsThisYear: (u.reviewsThisYear || 0) + 1 })),
        spaces: mapById(s.spaces, a.spaceId, (x) => ({
          ...x,
          status: yes >= 3 ? 'approved' : no >= 3 ? 'rejected' : x.status,
          readyForApproval: yes >= 3 || no >= 3 ? false : x.readyForApproval,
          rejections: a.yes ? x.rejections || [] : [...(x.rejections || []), { by: a.userId, reason: a.reason }],
        })),
      };
      n = awardToast(n, a.userId, POINTS.review, 'moderator review');
      if (yes >= 3 && sp.status !== 'approved') {
        const pts = sp.pendingPoints ?? uploadPoints({ photos: sp.photos.filter((p) => p.credit === sp.uploadedBy).length });
        n = award(n, sp.uploadedBy, pts, `Upload qualified: ${sp.name}`);
        n = notify(n, sp.uploadedBy, 'points', `“${sp.name}” qualified. +${fmtPoints(pts)} points.`, `/space/${a.spaceId}`);
      }
      if (!a.yes) n = notify(n, sp.uploadedBy, 'points', `A moderator voted that “${sp.name}” does not qualify: ${a.reason} You can appeal or resubmit.`, `/space/${a.spaceId}`);
      return n;
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
      let n = { ...s, users: mapById(s.users, a.userId, (u) => ({ ...u, paid: true, freeModelsLeft: s.config.paidFreeModels })) };
      if (a.method === 'points') n = award(n, a.userId, -s.config.paidTierPointsCost, 'Paid tier, one month');
      return toast(n, 'Paid tier is on for this month');
    }
    case 'COOP_VOTE':
      return toast({ ...s, coopDecisions: mapById(s.coopDecisions, a.id, (d) => ({ ...d, votes: { ...d.votes, [a.userId]: a.vote } })) }, 'Vote recorded');
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
      contest: (id) => state.contests.find((x) => x.id === id),
    };
    const architects = state.users.filter((u) => u.role === 'architect').sort((a, b) => b.points - a.points);
    return {
      state, dispatch, user, get, architects,
      role: state.role,
      here, // current in-app address, for returning after sign-up
      layout: state.layout,
      // One redesign per architect per week.
      uploadLimit: (userId) => {
        const now = Date.now() + state.weekSkip * WEEK;
        const last = Math.max(0, ...state.redesigns.filter((r) => r.architectId === userId).map((r) => r.createdAt || 0));
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
