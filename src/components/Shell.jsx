import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROLES, useDemo } from '../state/DemoContext.jsx';
import { Badge, Button, Modal, Toasts } from './ui.jsx';
import { fmtPoints } from '../lib/points.js';

const link = ({ isActive }) => (isActive ? 'active' : '');

function roleLinks({ isMember, isArchitect, isModerator, isPaid }) {
  if (!isMember) return [];
  const l = [];
  if (isArchitect) l.push(['/portfolio', 'Portfolio'], ['/earnings', 'Earnings']);
  l.push(['/purchases', 'My purchases'], ['/space/new', 'Create new space'], ['/points', 'Points & membership']);
  if (isModerator) l.push(['/moderation', 'Moderation'], ['/flags', 'Flag queue']);
  if (isPaid) l.push(['/contest/request', 'Host a contest']);
  l.push(['/profile', 'Profile']);
  return l;
}

// A button that opens a small menu. Closes on navigation, Escape or a click outside.
function Dropdown({ label, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const loc = useLocation();
  useEffect(() => { setOpen(false); }, [loc.pathname, loc.search]);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div className="menu-wrap" ref={ref}>
      <Button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true">{label}</Button>
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
            <span className="small muted">{role === 'owner' ? 'Private owner (no account)' : 'Not signed in'}</span>
            <Button variant="primary" to="/signup">Sign up</Button>
          </div>
        )}
      </div>
    </header>
  );
}

function DemoPanel() {
  const { state, dispatch, role } = useDemo();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  return (
    <aside className="demo" aria-label="Demo controls">
      <button type="button" className="demo-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>Demo: {ROLES.find((r) => r.id === role).label}</span>
        <span>{open ? 'Hide' : 'Switch role'}</span>
      </button>
      {open && (
        <div className="demo-body">
          <div className="demo-roles">
            {ROLES.map((r) => (
              <button key={r.id} type="button" className="demo-role" aria-pressed={role === r.id} onClick={() => dispatch({ type: 'SET_ROLE', role: r.id })}>
                {r.label}
              </button>
            ))}
          </div>
          <label className="row small">
            <input type="checkbox" checked={state.layout === 'tabs'} onChange={(e) => dispatch({ type: 'SET_LAYOUT', layout: e.target.checked ? 'tabs' : 'single' })} />
            Space page as tabs (alternative view)
          </label>
          <label className="row small">
            <input type="checkbox" checked={state.failNextPayment} onChange={(e) => dispatch({ type: 'SET_FAIL', on: e.target.checked })} />
            Make the next payment fail
          </label>
          <Button onClick={() => dispatch({ type: 'SKIP_WEEK' })}>Skip ahead one week</Button>
          <Button
            onClick={() => {
              dispatch({ type: 'RESET' });
              nav('/');
            }}
          >
            Reset demo data
          </Button>
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

export default function Shell() {
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    <>
      <Header />
      <Outlet />
      <SignupPrompt />
      <Toasts />
      <DemoPanel />
    </>
  );
}
