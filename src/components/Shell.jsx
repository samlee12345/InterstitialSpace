import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROLES, useDemo } from '../state/DemoContext.jsx';
import { Badge, Button, Icon, Modal, Toasts } from './ui.jsx';
import { fmtPoints } from '../lib/points.js';
import { activateNotes, addReply, allDiscussions, notesActive, notesCounts, revealNote, setNotesPage, startNotesTool } from '../review/notes-tool.js';
import { ALL_PAGES, PAGE_GROUPS, pageFor } from '../demo/pages.js';
import { setChoice, useChoices } from '../design/choices.js';

const link = ({ isActive }) => (isActive ? 'active' : '');

function roleLinks({ isMember, isArchitect, isModerator, isPaid }) {
  if (!isMember) return [];
  const l = [];
  if (isArchitect) l.push(['/portfolio', 'Portfolio'], ['/earnings', 'Earnings']);
  l.push(['/contributions', 'Contributions'], ['/purchases', 'My purchases'], ['/points', 'Points & membership']);
  if (isModerator) l.push(['/moderation', 'Spaces pending approval'], ['/flags', 'Flag queue']);
  if (isPaid) l.push(['/contest/request', 'Host a contest']);
  l.push(['/profile', 'Profile']);
  return l;
}

// A button that opens a small menu (disclosure pattern). Opening moves focus to the
// first item; Escape closes and returns focus to the button; navigation or a click outside closes.
export function Dropdown({ label, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const btn = useRef(null);
  const loc = useLocation();
  useEffect(() => { setOpen(false); }, [loc.pathname, loc.search]);
  useEffect(() => {
    if (!open) return undefined;
    ref.current?.querySelector('.menu a, .menu button')?.focus();
    const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div className="menu-wrap" ref={ref}>
      <button ref={btn} type="button" className="btn btn-default" onClick={() => setOpen(!open)} aria-expanded={open}>{label}</button>
      {open && <div className="menu stack-sm">{children}</div>}
    </div>
  );
}

function NotificationsMenu() {
  const { state, user, dispatch } = useDemo();
  const mine = state.notifications.filter((n) => n.to === user.id);
  const unread = mine.filter((n) => !n.read).length;
  return (
    <Dropdown label={<><Icon name="bell" /><span className="visually-hidden">Notifications</span>{unread > 0 && <span className="dot">{unread}<span className="visually-hidden"> unread</span></span>}</>}>
      {mine.length === 0 && <p className="small muted">Nothing yet.</p>}
      <ul className="list small">
        {mine.slice(0, 5).map((n) => (
          <li key={n.id} className={n.read ? '' : 'unread'}>
            <Link className="plain-link" to={n.link || '/notifications'} onClick={() => dispatch({ type: 'READ_ONE', id: n.id })}>
              <span className="xs muted">{n.type}</span>
              <br />
              {n.text}
            </Link>
          </li>
        ))}
      </ul>
      <Button to="/notifications">See all notifications</Button>
    </Dropdown>
  );
}

// After "Submit space": the points badge counts up the points waiting on approval.
function PointsFx() {
  const { state } = useDemo();
  const fx = state.pointsFx;
  const [shown, setShown] = useState(null); // { id, value }
  useEffect(() => {
    if (!fx) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const dur = reduce ? 0 : 900;
    let raf;
    const tick = (t) => {
      const k = dur ? Math.min(1, (t - start) / dur) : 1;
      setShown({ id: fx.id, value: fx.amount * (1 - (1 - k) ** 3) });
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const done = setTimeout(() => setShown(null), 3600);
    return () => { cancelAnimationFrame(raf); clearTimeout(done); };
  }, [fx?.id]);
  if (!shown) return null;
  return <span key={shown.id} className="points-fx" aria-hidden="true">+{fmtPoints(Math.round(shown.value * 8) / 8)} pending</span>;
}

function AccountMenu() {
  const d = useDemo();
  const { user } = d;
  return (
    <Dropdown
      label={
        <>
          {user.name}
          <span className="points-wrap"><PointsFx />{user.paid ? <Badge>{fmtPoints(user.points)} pts</Badge> : <Badge kind="dashed" title="Ghost points: what you’d collect as a paid member">{fmtPoints(user.points)} pts<span className="visually-hidden"> (ghost points)</span></Badge>}</span>
          <span className="caret" aria-hidden="true" />
        </>
      }
    >
      <div className="row">
        {user.verified && <Badge kind="solid">Verified</Badge>}
        {user.paid && <Badge>Paid</Badge>}
        <span className="xs muted">{user.role === 'architect' ? 'Architect account' : user.paid ? 'Paid account' : 'Community account'}</span>
      </div>
      {!user.paid && <p className="xs muted menu-note">Free tier: your {fmtPoints(user.points)} points are ghost points, shown with a dashed outline. Only paid members collect points. <Link to="/membership">Compare free and paid</Link></p>}
      <nav className="menu-links" aria-label="Your account">
        {roleLinks(d).map(([to, label]) => {
          // Contests waiting on your judgement show on Contributions.
          const toJudge = to === '/contributions' ? d.state.contests.filter((c) => c.coHostId === user.id && c.status === 'judging').length : 0;
          return <NavLink key={to} to={to} className={link}>{label}{toJudge > 0 && <span className="menu-count">{toJudge} to judge</span>}</NavLink>;
        })}
      </nav>
    </Dropdown>
  );
}

function Header() {
  const { isMember, isArchitect, user, role } = useDemo();
  return (
    <header className="header">
      <div className="header-in">
        <Link to="/" className="brand">Interstitial Spaces</Link>
        <nav className="nav" aria-label="Main">
          <NavLink to="/browse" className={link}>Browse spaces</NavLink>
          <NavLink to="/spaces/ranking" className={link}>Space ranking</NavLink>
          <NavLink to="/contests" className={link}>Contests</NavLink>
          <NavLink to="/ranking" className={link}>Architect ranking</NavLink>
          {isMember && <NavLink to="/co-op" className={link}>Co-op</NavLink>}
          {!isMember && <NavLink to="/about" className={link}>About us</NavLink>}
        </nav>
        {isMember ? (
          <div className="row">
            {isArchitect && (
              <Link to="/moderation" className="btn btn-default approvals-chip" title="Approve 10 spaces every 6 months to keep your architect status">
                Approvals <span className="approvals-count">{Math.min(user.reviewsThisYear || 0, 10)}/10</span>
                <span className="visually-hidden"> in the last 6 months</span>
              </Link>
            )}
            <NotificationsMenu />
            <AccountMenu />
          </div>
        ) : (
          <div className="row">
            {role === 'owner' && <span className="small muted">Private owner (no account)</span>}
            <NavLink to="/architects" className={({ isActive }) => `small ${isActive ? 'bold' : ''}`}>For architects</NavLink>
            <Button variant="primary" to="/login">Log in</Button>
          </div>
        )}
      </div>
    </header>
  );
}

const DRAWER_KEY = 'isp-demo-drawer';

const ZERO = { note: 0, discussion: 0, discussed: 0 };
const add = (a, c) => ({ note: a.note + c.note, discussion: a.discussion + c.discussion, discussed: a.discussed + (c.discussed || 0) });
const splitKey = (key) => { const [path, suffix = ''] = key.split('~'); return [path, suffix]; };

// Notes and discussions for a page: summed across its views, for one view
// (`viewId`), or for one exact path such as a single space (`path`).
// A page's total is always the sum of its views.
function countFor(counts, page, viewId, path) {
  return Object.entries(counts).reduce((n, [key, c]) => {
    const [p, suffix] = splitKey(key);
    if (pageFor(p) !== page) return n;
    if (path !== undefined && p !== path) return n;
    if (viewId !== undefined && suffix !== viewId) return n;
    return add(n, c);
  }, ZERO);
}

// The view a page is showing, from the design choices. Each becomes a notes
// key suffix, e.g. /space/s2~strip. Default views keep their old suffix so
// earlier notes stay with them ('tabs' for the space page, 'map' for landing).
export function viewFor(pageId, choices) {
  if (pageId === 'space') return { portrait: 'tabs', strip: 'strip', compact: 'compact' }[choices.spaceHeader] || 'tabs';
  if (pageId === 'landing') return 'map';
  if (pageId === 'space-new') return ['overlay', 'confirm', 'popover'].includes(choices.createFlow) ? choices.createFlow : '';
  if (pageId === 'contest') return choices.contestEligibility === 'both' ? '' : choices.contestEligibility;
  return '';
}

// Notes left on views that no longer exist (e.g. the old one-page space layout).
function retired(counts, page) {
  if (!page.views) return ZERO;
  const ids = page.views.map((v) => v.id);
  return Object.entries(counts).reduce((n, [key, c]) => {
    const [p, suffix] = splitKey(key);
    return pageFor(p) === page && !ids.includes(suffix) ? add(n, c) : n;
  }, ZERO);
}

// Keys that belong to no page in the list (the sandbox, a mistyped address).
function otherKeys(counts) {
  return Object.entries(counts).filter(([key, c]) => !pageFor(splitKey(key)[0]) && c.note + c.discussion > 0);
}

// Purple = notes, teal = discussions (same colours as the Notes tool).
// Discussions read "discussed/total", e.g. 1/5 when one has a response.
function NoteCounts({ n }) {
  const d = `${n.discussed} of ${n.discussion} discussions discussed`;
  return (
    <>
      {n.note > 0 && <span className="demo-notes" title={`${n.note} ${n.note === 1 ? 'note' : 'notes'}`} aria-label={`${n.note} ${n.note === 1 ? 'note' : 'notes'}`}>{n.note}</span>}
      {n.discussion > 0 && <span className={`demo-notes demo-discuss ${n.discussed === n.discussion ? 'demo-discuss-done' : ''}`} title={d} aria-label={d}>{n.discussed}/{n.discussion}</span>}
    </>
  );
}

function useNotesCounts() {
  const [counts, setCounts] = useState(notesCounts);
  useEffect(() => {
    const sync = () => setCounts(notesCounts());
    window.addEventListener('isp-notes-change', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('isp-notes-change', sync); window.removeEventListener('storage', sync); };
  }, []);
  return counts;
}

function PageList({ close }) {
  const { state, dispatch, role } = useDemo();
  const choices = useChoices();
  const loc = useLocation();
  const nav = useNavigate();
  const counts = useNotesCounts();
  const currentView = (page) => viewFor(page.id, choices);
  const go = (page, view) => {
    if (page.role && page.role !== role) dispatch({ type: 'SET_ROLE', role: page.role });
    if (view?.choice) setChoice(...view.choice);
    nav(page.to);
    if (window.matchMedia('(max-width: 64rem)').matches) close();
  };
  return (
    <div className="stack">
      {PAGE_GROUPS.map((g) => (
        <section key={g.group} className="stack-sm" aria-label={g.group}>
          <h3 className="demo-h">{g.group}</h3>
          <ul className="demo-pages">
            {g.pages.map((p) => {
              const here = p.match(loc.pathname);
              const total = countFor(counts, p);
              return (
                <li key={p.id}>
                  <button type="button" className="demo-page" aria-current={here && !p.views ? 'page' : undefined} onClick={() => go(p, p.views?.[0])}>
                    <span className="grow">{p.label}</span>
                    <NoteCounts n={total} />
                    <span className={`demo-kind demo-kind-${p.kind}`}>{p.kind === 'clickable' ? 'Clickable' : 'Simulated'}</span>
                  </button>
                  {p.controls === 'create' && (
                    <div className="demo-control-row">
                      {[['createGeotag', 'Photos have location data'], ['createNearby', 'Photos taken next to documented spaces']].map(([key, label]) => (
                        <fieldset key={key} className="demo-control">
                          <legend>{label}</legend>
                          {[[true, 'Yes'], [false, 'No']].map(([val, l]) => (
                            <label key={l} className="row xs">
                              <input type="radio" name={key} checked={state[key] === val} onChange={() => dispatch({ type: 'SET_CREATE', key, value: val })} />
                              {l}
                            </label>
                          ))}
                        </fieldset>
                      ))}
                    </div>
                  )}
                  {p.variants && (
                    <div className="stack-sm demo-variants">
                      <span className="xs muted">Open a space that is:</span>
                      <ul className="demo-chips">
                        {p.variants.map(([label, to]) => (
                          <li key={label}><button type="button" className="demo-chip" aria-current={loc.pathname === to ? 'true' : undefined} onClick={() => go({ ...p, to })}>{label}<NoteCounts n={countFor(counts, p, undefined, to)} /></button></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {p.controls === 'architect-kind' && (
                    <fieldset className="demo-control">
                      <legend>The signed-in architect is</legend>
                      {[['licensed', 'Licensed'], ['student', 'A student']].map(([val, l]) => (
                        <label key={val} className="row xs">
                          <input type="radio" name="architect-kind" checked={state.architectKind === val} onChange={() => dispatch({ type: 'SET_ARCHITECT_KIND', kind: val })} />
                          {l}
                        </label>
                      ))}
                    </fieldset>
                  )}
                  {p.views && (
                    <ul className="demo-views">
                      {p.views.map((v) => {
                        const n = countFor(counts, p, v.id);
                        return (
                          <li key={v.id || 'default'}>
                            <button type="button" className="demo-page demo-view" aria-current={here && currentView(p) === v.id ? 'page' : undefined} onClick={() => go(p, v)}>
                              <span className="grow">{v.label}</span>
                              <NoteCounts n={n} />
                            </button>
                            {v.control === 'locate' && (
                              <fieldset className="demo-control">
                                <legend>“Use my location” finds</legend>
                                {[['new', 'A new place'], ['existing', 'An existing space']].map(([val, label]) => (
                                  <label key={val} className="row xs">
                                    <input type="radio" name="locate-finds" checked={state.locateFinds === val} onChange={() => dispatch({ type: 'SET_LOCATE', value: val })} />
                                    {label}
                                  </label>
                                ))}
                              </fieldset>
                            )}
                          </li>
                        );
                      })}
                      {retired(counts, p).note + retired(counts, p).discussion > 0 && (
                        <li>
                          <span className="demo-page demo-view demo-retired">
                            <span className="grow">Notes on retired layouts</span>
                            <NoteCounts n={retired(counts, p)} />
                          </span>
                        </li>
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {otherKeys(counts).length > 0 && (
        <section className="stack-sm" aria-label="Other pages">
          <h3 className="demo-h">Other pages</h3>
          <ul className="demo-pages">
            {otherKeys(counts).map(([key, c]) => {
              const [path, suffix] = splitKey(key);
              const label = path === 'sandbox' ? 'Component sandbox' : `${path}${suffix ? ` (${suffix})` : ''}`;
              return (
                <li key={key}>
                  {path === 'sandbox'
                    ? <a className="demo-page" href="sandbox.html"><span className="grow">{label}</span><NoteCounts n={add(ZERO, c)} /></a>
                    : <button type="button" className="demo-page" onClick={() => nav(path)}><span className="grow">{label}</span><NoteCounts n={add(ZERO, c)} /></button>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function useAllDiscussions() {
  const [list, setList] = useState(allDiscussions);
  useEffect(() => {
    const sync = () => setList(allDiscussions());
    window.addEventListener('isp-notes-change', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('isp-notes-change', sync); window.removeEventListener('storage', sync); };
  }, []);
  return list;
}

// Where a notes key lives: "/space/s2~tabs" → the page, its view and a label.
function placeOf(key) {
  const [path, suffix] = splitKey(key);
  const page = path === 'sandbox' ? null : pageFor(path);
  const view = page?.views?.find((v) => v.id === suffix);
  const retiredView = page?.views && suffix && !view;
  const title = path === 'sandbox' ? 'Component sandbox' : page ? page.label : path;
  const sub = view ? view.label : retiredView ? `Retired layout (${suffix})` : suffix || '';
  return { path, page, view, title, sub, retiredView };
}

function DiscussionItem({ pageKey, d, open }) {
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState('');
  const save = () => { addReply(pageKey, d.id, text); setText(''); setWriting(false); };
  const done = d.replies.length > 0;
  return (
    <li className={`demo-disc ${done ? 'is-done' : ''}`}>
      <button type="button" className="demo-disc-open" onClick={open} title="Open this discussion on its page">
        <span className="demo-disc-num" aria-label={`Discussion ${d.number}${done ? ', discussed' : ', open'}`}>{d.number}</span>
        <span className="demo-disc-text">{d.text}</span>
      </button>
      {d.replies.length > 0 && (
        <ul className="demo-disc-replies" aria-label={`Responses to discussion ${d.number}`}>
          {d.replies.map((r) => <li key={r.id}>{r.text}</li>)}
        </ul>
      )}
      {writing ? (
        <div className="stack-sm demo-disc-form">
          <textarea
            className="input"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What did you decide?"
            aria-label={`Response to discussion ${d.number}`}
            autoFocus
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
              if (e.key === 'Escape') { setWriting(false); setText(''); }
            }}
          />
          <div className="row">
            <button type="button" className="btn btn-sm btn-primary" onClick={save} disabled={!text.trim()}>Save response</button>
            <button type="button" className="btn btn-sm btn-quiet" onClick={() => { setWriting(false); setText(''); }}>Cancel</button>
            <span className="xs muted">⌘↵ to save</span>
          </div>
        </div>
      ) : (
        <button type="button" className="link-btn xs demo-disc-reply" onClick={() => setWriting(true)}>
          {done ? 'Add another response' : 'Add a response'}<span className="visually-hidden"> to discussion {d.number}</span>
        </button>
      )}
    </li>
  );
}

// Every discussion, grouped by the page (and layout) it's pinned to.
function DiscussionsTab({ close }) {
  const { dispatch, role } = useDemo();
  const nav = useNavigate();
  const groups = useAllDiscussions();
  const [show, setShow] = useState('open');
  const total = groups.reduce((t, g) => t + g.items.length, 0);
  const openCount = groups.reduce((t, g) => t + g.items.filter((d) => !d.replies.length).length, 0);
  // Same order as the Pages tab; anything not in it goes last.
  const rank = (key) => { const i = ALL_PAGES.indexOf(placeOf(key).page); return i === -1 ? ALL_PAGES.length : i; };
  const visible = [...groups]
    .sort((a, b) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key))
    .map((g) => ({ ...g, items: show === 'open' ? g.items.filter((d) => !d.replies.length) : g.items }))
    .filter((g) => g.items.length);
  const go = (key, id) => {
    const { path, page, view } = placeOf(key);
    if (path === 'sandbox') { window.location.href = `${import.meta.env.BASE_URL}sandbox.html`; return; }
    if (page?.role && page.role !== role) dispatch({ type: 'SET_ROLE', role: page.role });
    if (view?.choice) setChoice(...view.choice);
    nav(path);
    revealNote(id);
    if (window.matchMedia('(max-width: 64rem)').matches) close();
  };
  if (!total) {
    return <p className="small muted">No discussions yet. Turn on notes and press D, then select something on a page to start one.</p>;
  }
  return (
    <div className="stack">
      <div className="row between">
        <div className="demo-filter" role="group" aria-label="Show">
          <button type="button" aria-pressed={show === 'open'} onClick={() => setShow('open')}>Needs a response <span className="muted">{openCount}</span></button>
          <button type="button" aria-pressed={show === 'all'} onClick={() => setShow('all')}>All <span className="muted">{total}</span></button>
        </div>
      </div>
      <p className="xs muted">Select a discussion to open it on its page. Discussions with a response count as discussed.</p>
      {visible.length === 0 && <p className="small muted">Every discussion has a response.</p>}
      {visible.map((g) => {
        const where = placeOf(g.key);
        const all = groups.find((x) => x.key === g.key).items;
        return (
          <section key={g.key} className="stack-sm" aria-label={`${where.title}${where.sub ? `, ${where.sub}` : ''}`}>
            <div className="demo-disc-head">
              <h3 className="demo-h">{where.title}</h3>
              <span className="xs muted">{all.filter((d) => d.replies.length).length}/{all.length} discussed</span>
            </div>
            <p className="xs muted demo-disc-path">{where.path}{where.sub ? ` · ${where.sub}` : ''}</p>
            {where.retiredView && <p className="xs muted">This layout is retired, so these open the page without their pins.</p>}
            <ul className="demo-discs">
              {g.items.map((d) => <DiscussionItem key={d.id} pageKey={g.key} d={d} open={() => go(g.key, d.id)} />)}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

const TAB_KEY = 'isp-demo-tab';
function DemoPanel() {
  const { state, dispatch, role } = useDemo();
  const [open, setOpenRaw] = useState(() => { try { return localStorage.getItem(DRAWER_KEY) === '1'; } catch { return false; } });
  const setOpen = (v) => { setOpenRaw(v); try { localStorage.setItem(DRAWER_KEY, v ? '1' : '0'); } catch { /* ignore */ } };
  const nav = useNavigate();
  const counts = useNotesCounts();
  const totals = Object.values(counts).reduce(add, ZERO);
  const [tab, setTabRaw] = useState(() => { try { return localStorage.getItem(TAB_KEY) || 'pages'; } catch { return 'pages'; } });
  const setTab = (t) => { setTabRaw(t); try { localStorage.setItem(TAB_KEY, t); } catch { /* ignore */ } };
  const onTabKey = (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next = tab === 'pages' ? 'discussions' : 'pages';
    setTab(next);
    document.getElementById(`demo-tab-${next}`)?.focus();
  };
  // While the drawer is open, the page makes room for it instead of being covered.
  useEffect(() => {
    document.body.classList.toggle('demo-open', open);
    return () => document.body.classList.remove('demo-open');
  }, [open]);
  const roleLabel = ROLES.find((r) => r.id === role).label;

  if (!open) {
    return (
      <button type="button" className="demo-pill" onClick={() => setOpen(true)} aria-expanded="false" aria-controls="demo-drawer">
        <span>Demo: {roleLabel}</span>
        <NoteCounts n={totals} />
      </button>
    );
  }
  return (
    <aside id="demo-drawer" className="demo-drawer" aria-label="Demo controls">
      <div className="demo-drawer-head">
        <h2 className="demo-title">Demo controls</h2>
        <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)} aria-expanded="true">Close</button>
      </div>
      <div className="demo-tabs" role="tablist" aria-label="Demo controls">
        <button type="button" role="tab" id="demo-tab-pages" aria-selected={tab === 'pages'} aria-controls="demo-panel-pages" tabIndex={tab === 'pages' ? 0 : -1} onClick={() => setTab('pages')} onKeyDown={onTabKey}>Pages</button>
        <button type="button" role="tab" id="demo-tab-discussions" aria-selected={tab === 'discussions'} aria-controls="demo-panel-discussions" tabIndex={tab === 'discussions' ? 0 : -1} onClick={() => setTab('discussions')} onKeyDown={onTabKey}>
          Discussions <span className="demo-tab-count">{totals.discussed}/{totals.discussion}</span>
        </button>
      </div>
      {tab === 'discussions' && (
        <div className="demo-drawer-body" role="tabpanel" id="demo-panel-discussions" aria-labelledby="demo-tab-discussions">
          <DiscussionsTab close={() => setOpen(false)} />
        </div>
      )}
      {tab === 'pages' && (
      <div className="demo-drawer-body" role="tabpanel" id="demo-panel-pages" aria-labelledby="demo-tab-pages">
        <section className="stack-sm" aria-labelledby="demo-role-h">
          <h3 id="demo-role-h" className="demo-h">Viewing as</h3>
          <div className="demo-roles">
            {ROLES.map((r) => (
              <button key={r.id} type="button" className="demo-role" aria-pressed={role === r.id} onClick={() => dispatch({ type: 'SET_ROLE', role: r.id })}>
                {r.label}
              </button>
            ))}
          </div>
        </section>
        <section className="stack-sm" aria-labelledby="demo-pages-h">
          <div className="row between">
            <h3 id="demo-pages-h" className="demo-h">Pages to review</h3>
            <span className="xs muted">{totals.note} {totals.note === 1 ? 'note' : 'notes'}, {totals.discussed} of {totals.discussion} {totals.discussion === 1 ? 'discussion' : 'discussions'} discussed</span>
          </div>
          <p className="xs muted">Opening a page switches to a role that can see it. Purple numbers are notes. Teal shows discussions as discussed/total; a discussion counts as discussed once it has a response.</p>
          <PageList close={() => setOpen(false)} />
        </section>
        <section className="stack-sm" aria-labelledby="demo-ctl-h">
          <h3 id="demo-ctl-h" className="demo-h">Controls</h3>
          <label className="row small">
            <input type="checkbox" checked={state.failNextPayment} onChange={(e) => dispatch({ type: 'SET_FAIL', on: e.target.checked })} />
            Make the next payment fail
          </label>
          <Button onClick={() => dispatch({ type: 'SKIP_WEEK' })}>Skip ahead one week</Button>
          <NotesButton />
          <a className="btn" href={`${import.meta.env.BASE_URL}sandbox.html`}>Open component sandbox</a>
          <Button onClick={() => { dispatch({ type: 'RESET' }); nav('/'); }}>Reset demo data</Button>
          <p className="xs muted">All spaces, people, prices and organisations are placeholders.</p>
        </section>
      </div>
      )}
    </aside>
  );
}

const PROMPT_COPY = {
  redesigns: 'Redesigns are for members. Create a free account to see and buy them.',
  upload: 'Create a free account to document a space.',
  comment: 'Create a free account to comment.',
  vote: 'Create a free account to vote for spaces you want improved.',
  report: 'Create a free account to report that a space has changed.',
  buy: 'Create a free account to buy redesigns and measured models.',
};

function SignupPrompt() {
  const { state, dispatch } = useDemo();
  const nav = useNavigate();
  if (!state.signupPrompt) return null;
  const close = () => dispatch({ type: 'CLOSE_SIGNUP' });
  return (
    <Modal title="Sign up to continue" onClose={close}>
      <p>{PROMPT_COPY[state.signupPrompt] || PROMPT_COPY.redesigns}</p>
      <ul className="small">
        <li>See redesigns and measured models</li>
        <li>Upload spaces, comment and vote</li>
        <li>One vote in the co-op, and a share of any year-end surplus</li>
      </ul>
      <div className="row">
        <Button
          variant="primary"
          onClick={() => {
            dispatch({ type: 'OPEN_SIGNUP', reason: null });
            nav('/signup');
          }}
        >
          Sign up
        </Button>
        <Button onClick={close}>Not now</Button>
      </div>
      <p className="small muted">If you close this, you can keep browsing 10 spaces. The rest stay blurred until you sign up.</p>
    </Modal>
  );
}

// Keeps the Notes tool on the current page's list of notes.
// The key adds the view when it isn't the default, e.g. "/space/s2~tabs".
export function NotesBridge({ page }) {
  const loc = useLocation();
  const choices = useChoices();
  const path = page || loc.pathname;
  const pageDef = page ? null : pageFor(path);
  const view = pageDef ? viewFor(pageDef.id, choices) : '';
  const key = view ? `${path}~${view}` : path;
  useEffect(() => { startNotesTool(); }, []);
  useEffect(() => { setNotesPage(key); }, [key]);
  return null;
}

function NotesButton() {
  const [on, setOn] = useState(notesActive());
  useEffect(() => {
    const sync = () => setOn(notesActive());
    window.addEventListener('isp-notes-change', sync);
    return () => window.removeEventListener('isp-notes-change', sync);
  }, []);
  return (
    <Button onClick={activateNotes} aria-keyshortcuts="N">
      {on ? 'Notes are on (N: note, D: discussion)' : 'Turn on notes (or press N or D)'}
    </Button>
  );
}

function Footer() {
  const cols = [
    ['Explore', [['/browse', 'Browse spaces'], ['/spaces/ranking', 'Space ranking'], ['/contests', 'Contests'], ['/ranking', 'Architect ranking']]],
    ['Take part', [['/architects', 'For architects'], ['/contest/request', 'Host a contest'], ['/co-op', 'The co-op']]],
    ['About', [['/about', 'About us'], ['/contact', 'Contact us']]],
    ['Legal', [['/terms', 'Terms of Use'], ['/privacy', 'Privacy policy']]],
  ];
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="stack-sm footer-brand">
          <span className="bold">Interstitial Spaces</span>
          <span className="small muted">A co-operative for documenting and redesigning the in-between places of a city.</span>
        </div>
        {cols.map(([h, links]) => (
          <nav key={h} aria-label={h} className="stack-sm">
            <h2 className="footer-h">{h}</h2>
            <ul className="footer-links">
              {links.map(([to, label]) => <li key={to}><Link to={to}>{label}</Link></li>)}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}

export default function Shell() {
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <Header />
      <Outlet />
      <Footer />
      <SignupPrompt />
      <Toasts />
      <div className="demo-tray" role="region" aria-label="Demo only">
        <span className="demo-tray-label">Demo only</span>
        <div id="demo-tray-items" className="demo-tray-items" />
      </div>
      <DemoPanel />
      <NotesBridge />
    </>
  );
}
