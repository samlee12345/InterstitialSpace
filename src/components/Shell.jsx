import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROLES, useDemo } from '../state/DemoContext.jsx';
import { Badge, Button, Modal, Toasts } from './ui.jsx';
import { fmtPoints } from '../lib/points.js';
import { activateNotes, notesActive, notesCounts, setNotesPage, startNotesTool } from '../review/notes-tool.js';
import { PAGE_GROUPS, pageFor } from '../demo/pages.js';
import { setChoice, useChoices } from '../design/choices.js';

const link = ({ isActive }) => (isActive ? 'active' : '');

function roleLinks({ isMember, isArchitect, isModerator, isPaid }) {
  if (!isMember) return [];
  const l = [];
  if (isArchitect) l.push(['/portfolio', 'Portfolio'], ['/earnings', 'Earnings']);
  l.push(['/contributions', 'Contributions'], ['/purchases', 'My purchases'], ['/points', 'Points & membership']);
  if (isModerator) l.push(['/moderation', 'Moderation'], ['/flags', 'Flag queue']);
  if (isPaid) l.push(['/contest/request', 'Host a contest']);
  l.push(['/profile', 'Profile']);
  return l;
}

// A button that opens a small menu (disclosure pattern). Opening moves focus to the
// first item; Escape closes and returns focus to the button; navigation or a click outside closes.
function Dropdown({ label, children }) {
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
    <Dropdown label={<>Notifications {unread > 0 && <span className="dot">{unread}</span>}</>}>
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

function AccountMenu() {
  const d = useDemo();
  const { user } = d;
  return (
    <Dropdown
      label={
        <>
          {user.name}
          <Badge>{fmtPoints(user.points)} pts</Badge>
          <span className="caret" aria-hidden="true" />
        </>
      }
    >
      <div className="row">
        {user.verified && <Badge kind="solid">Verified</Badge>}
        {user.paid && <Badge>Paid</Badge>}
        <span className="xs muted">{user.role === 'architect' ? 'Architect account' : user.paid ? 'Paid account' : 'Community account'}</span>
      </div>
      <nav className="menu-links" aria-label="Your account">
        {roleLinks(d).map(([to, label]) => (
          <NavLink key={to} to={to} className={link}>{label}</NavLink>
        ))}
      </nav>
    </Dropdown>
  );
}

function Header() {
  const { isMember, role } = useDemo();
  return (
    <header className="header">
      <div className="header-in">
        <Link to="/" className="brand">Interstitial Spaces</Link>
        <nav className="nav" aria-label="Main">
          <NavLink to="/browse" className={link}>Browse spaces</NavLink>
          <NavLink to="/contests" className={link}>Contests</NavLink>
          <NavLink to="/ranking" className={link}>Architect ranking</NavLink>
          {isMember && <NavLink to="/co-op" className={link}>Co-op</NavLink>}
          <NavLink to="/terms" className={link}>Terms</NavLink>
        </nav>
        {isMember ? (
          <div className="row">
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

// Notes and discussions for a page, summed across its views or for one view.
function countFor(counts, page, viewId) {
  return Object.entries(counts).reduce((n, [key, c]) => {
    const [path, suffix = ''] = key.split('~');
    if (!page.match(path)) return n;
    if (viewId === undefined || suffix === viewId) return { note: n.note + c.note, discussion: n.discussion + c.discussion };
    return n;
  }, { note: 0, discussion: 0 });
}

// Purple = notes, teal = discussions (same colours as the Notes tool).
function NoteCounts({ n }) {
  return (
    <>
      {n.note > 0 && <span className="demo-notes" title={`${n.note} notes`} aria-label={`${n.note} notes`}>{n.note}</span>}
      {n.discussion > 0 && <span className="demo-notes demo-discuss" title={`${n.discussion} discussions`} aria-label={`${n.discussion} discussions`}>{n.discussion}</span>}
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
  const { landingLayout } = useChoices();
  const loc = useLocation();
  const nav = useNavigate();
  const counts = useNotesCounts();
  const { createFlow } = useChoices();
  const currentView = (page) => (page.id === 'space' ? (state.layout === 'tabs' ? 'tabs' : '') : page.id === 'landing' ? (landingLayout === 'map' ? 'map' : '') : page.id === 'space-new' ? (['overlay', 'confirm'].includes(createFlow) ? createFlow : '') : '');
  const go = (page, view) => {
    if (page.role && page.role !== role) dispatch({ type: 'SET_ROLE', role: page.role });
    if (view?.layout) dispatch({ type: 'SET_LAYOUT', layout: view.layout });
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
                          <li key={label}><button type="button" className="demo-chip" aria-current={loc.pathname === to ? 'true' : undefined} onClick={() => go({ ...p, to })}>{label}</button></li>
                        ))}
                      </ul>
                    </div>
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
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function DemoPanel() {
  const { state, dispatch, role } = useDemo();
  const [open, setOpenRaw] = useState(() => { try { return localStorage.getItem(DRAWER_KEY) === '1'; } catch { return false; } });
  const setOpen = (v) => { setOpenRaw(v); try { localStorage.setItem(DRAWER_KEY, v ? '1' : '0'); } catch { /* ignore */ } };
  const nav = useNavigate();
  const counts = useNotesCounts();
  const totals = Object.values(counts).reduce((a, c) => ({ note: a.note + c.note, discussion: a.discussion + c.discussion }), { note: 0, discussion: 0 });
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
      <div className="demo-drawer-body">
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
            <span className="xs muted">{totals.note} notes, {totals.discussion} discussions</span>
          </div>
          <p className="xs muted">Opening a page switches to a role that can see it. Purple numbers are notes, teal are discussions.</p>
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
    </aside>
  );
}

const PROMPT_COPY = {
  redesigns: 'Redesigns are for members. Create a free account to see and buy them.',
  upload: 'Create a free account to document a space.',
  comment: 'Create a free account to comment.',
  vote: 'Create a free account to vote for spaces you want improved.',
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
  const { layout } = useDemo();
  const { landingLayout, createFlow } = useChoices();
  const path = page || loc.pathname;
  const pageDef = page ? null : pageFor(path);
  const view = pageDef?.id === 'space' && layout === 'tabs' ? 'tabs'
    : pageDef?.id === 'landing' && landingLayout === 'map' ? 'map'
      : pageDef?.id === 'space-new' && ['overlay', 'confirm'].includes(createFlow) ? createFlow : '';
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

export default function Shell() {
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <Header />
      <Outlet />
      <SignupPrompt />
      <Toasts />
      <DemoPanel />
      <NotesBridge />
    </>
  );
}
