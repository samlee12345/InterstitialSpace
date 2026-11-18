import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { fmtPoints } from '../lib/points.js';

// Authored line icons: one stroke weight, drawn on a 20px grid.
const ICONS = {
  vote: 'M10 4 4.5 10.5h3.5V16h4v-5.5h3.5Z',
  photo: 'M3 7h3l1.5-2h5L14 7h3v9H3Z M10 14a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  redesign: 'M4 16l.9-3.6L13 4.3l2.7 2.7-8.1 8.1Z M11.4 5.9l2.7 2.7',
  locate: 'M10 3v2.5 M10 14.5V17 M3 10h2.5 M14.5 10H17 M10 14.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z M10 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  pin: 'M10 17s5-4.6 5-8.5a5 5 0 0 0-10 0C5 12.4 10 17 10 17Z M10 10.2a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Z',
  bell: 'M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.5 1.5H4Z M8.5 16.5a1.5 1.5 0 0 0 3 0',
};
export function Icon({ name, label }) {
  return (
    <svg className="icon" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
      <path d={ICONS[name]} />
    </svg>
  );
}

export function Button({ variant = 'default', to, className = '', ...p }) {
  const cls = `btn btn-${variant} ${className}`;
  return to ? <Link className={cls} to={to} {...p} /> : <button type="button" className={cls} {...p} />;
}


// `tag` (clickable / simulated) is kept for reference; the Demo bar shows it now, not the page.
export function Page({ narrow, wide, children }) {
  return (
    <main id="main" tabIndex={-1} className={`page stack-lg ${narrow ? 'narrow' : ''} ${wide ? 'page-wide' : ''}`} data-screen-label="page">
      {children}
    </main>
  );
}

export function ImageBox({ label = 'Image', shape = '', className = '' }) {
  return (
    <div className={`imgbox ${shape ? `imgbox-${shape}` : ''} ${className}`} role="img" aria-label={`Placeholder: ${label}`}>
      <span>{label}</span>
    </div>
  );
}

export function Badge({ kind = '', title, children }) {
  return <span className={`badge ${kind ? `badge-${kind}` : ''}`} title={title}>{children}</span>;
}

// Points are shown to signed-in members only, never to visitors.
export function PointsBadge({ userId }) {
  const { isMember, get } = useDemo();
  const u = get.user(userId);
  if (!isMember || !u) return null;
  return (
    <>
      {/* Other people's tier is private, so their badge doesn't say whether the points are ghost points. */}
      <Badge>{fmtPoints(u.points)} pts</Badge>
      {u.verified && <Badge kind="solid">Verified</Badge>}
    </>
  );
}

// Marks a contribution as the signed-in member's own.
export function Mine({ userId }) {
  const { user } = useDemo();
  return user && user.id === userId ? <Badge kind="solid">Yours</Badge> : null;
}

// Confirmation banner shown at the top of a page after a submission.
export function Banner({ banner, onClose }) {
  if (!banner) return null;
  return (
    <div className="alert banner" role="status">
      <div className="row between row-top">
        <h2>{banner.title}</h2>
        <Button variant="quiet" onClick={onClose}>Dismiss</Button>
      </div>
      <p>{banner.text}</p>
      {banner.links?.length > 0 && (
        <div className="row">
          {banner.links.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
        </div>
      )}
    </div>
  );
}

export function StatusBadges({ space }) {
  return (
    <>
      {space.status === 'pending' && <Badge kind="dashed">Pending</Badge>}
      {space.status === 'rejected' && <Badge kind="dashed">Did not qualify</Badge>}
      {space.removal === 'review' && <Badge kind="dashed">Removal under review</Badge>}
    </>
  );
}

export function Field({ label, hint, error, children }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {typeof children === 'function' ? children(id) : children}
      {hint && <span className="small muted">{hint}</span>}
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}

export function Input({ label, hint, error, textarea, ...p }) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(id) => (textarea ? <textarea id={id} className="input" {...p} /> : <input id={id} className="input" {...p} />)}
    </Field>
  );
}

export function Select({ label, hint, options, ...p }) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <select id={id} className="input" {...p}>
          {options.map((o) => (
            <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function Choice({ name, value, checked, onChange, disabled, title, children, type = 'radio' }) {
  return (
    <label className="choice">
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} disabled={disabled} />
      <span className="stack-sm">
        <span className="bold">{title}</span>
        {children && <span className="small muted">{children}</span>}
      </span>
    </label>
  );
}

// File picker. Real files can be chosen (only their names are kept), or sample names added in one click.
export function FileDrop({ label, files, onChange, samples = ['drawings.pdf', 'model.3dm'], error, accept }) {
  const ref = useRef(null);
  const [refused, setRefused] = useState([]);
  // With `accept` (e.g. ['.dwg', '.dxf']) other file types are refused with a message.
  const ok = (name) => !accept || accept.some((ext) => name.toLowerCase().endsWith(ext));
  const addNames = (names) => {
    setRefused(names.filter((n) => !ok(n)));
    onChange([...new Set([...files, ...names.filter(ok)])]);
  };
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="drop">
        <div className="row">
          <Button onClick={() => ref.current.click()}>Choose files</Button>
          <Button variant="quiet" onClick={() => addNames(samples)}>Use sample files</Button>
          <input ref={ref} type="file" multiple hidden aria-label={label} accept={accept?.join(',')} onChange={(e) => addNames([...e.target.files].map((f) => f.name))} />
        </div>
        {files.length === 0 ? (
          <span className="small muted">{accept ? `Accepted: ${accept.join(', ')}. ` : ''}No files yet. Nothing is uploaded anywhere — the prototype only keeps file names.</span>
        ) : (
          <ul className="files">
            {files.map((f) => (
              <li key={f}>
                <span>{f}</span>
                <Button variant="quiet" onClick={() => onChange(files.filter((x) => x !== f))} aria-label={`Remove ${f}`}>Remove</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {refused.length > 0 && <span className="error" role="alert">Not added: {refused.join(', ')}. Only {accept.join(', ')} files are accepted.</span>}
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}

// Tabs: roving focus, arrow keys, Home/End, linked to their panel.
export function Tabs({ tabs, active, onChange, idBase = 'tabs' }) {
  const refs = useRef({});
  const move = (e, i) => {
    const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = tabs[(keys[e.key] + tabs.length) % tabs.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  };
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => { refs.current[t.id] = el; }}
          role="tab"
          type="button"
          id={`${idBase}-tab-${t.id}`}
          aria-controls={`${idBase}-panel`}
          aria-selected={active === t.id}
          tabIndex={active === t.id ? 0 : -1}
          className="tab"
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => move(e, i)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ idBase = 'tabs', id, children }) {
  return (
    <div role="tabpanel" id={`${idBase}-panel`} aria-labelledby={`${idBase}-tab-${id}`} tabIndex={0} className="stack-lg tabpanel">
      {children}
    </div>
  );
}

// Progress through a multi-step flow: "Step 2 of 4: Location", with a segmented bar.
export function Steps({ steps, current }) {
  return (
    <div className="progress">
      <p className="small">
        <span className="muted">Step {current + 1} of {steps.length}:</span> <span className="bold">{steps[current]}</span>
      </p>
      <ol className="progress-bar" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s} className={i < current ? 'done' : i === current ? 'now' : ''} aria-current={i === current ? 'step' : undefined}>
            <span className="visually-hidden">{s}{i < current ? ' (done)' : ''}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Form buttons: right-aligned, the secondary action (Back, Cancel) before the primary one.
export function FormActions({ children }) {
  return <div className="form-actions">{children}</div>;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Dialog: moves focus in, keeps Tab inside, Escape closes, and focus returns to what opened it.
export function Modal({ title, onClose, wide, children }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const opener = document.activeElement;
    const box = ref.current;
    (box.querySelector('input, textarea, select') || [...box.querySelectorAll(FOCUSABLE)].find((x) => !x.classList.contains('modal-x')) || box).focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); return; }
      if (e.key !== 'Tab') return;
      const items = [...box.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const [first, last] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener && document.contains(opener)) opener.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          {onClose && (
            <button type="button" className="modal-x" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" /></svg>
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="card sunken">
      <h3>{title}</h3>
      <div className="stack-sm muted">{children}</div>
    </div>
  );
}

export function Tally({ yes, no, total = 5 }) {
  return (
    <div className="row">
      <div className="tally" role="img" aria-label={`${yes} yes, ${no} no, ${total - yes - no} not voted`}>
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={i < yes ? 'yes' : i < yes + no ? 'no' : ''} />
        ))}
      </div>
      <span className="small">{yes} yes, {no} no, {Math.max(total - yes - no, 0)} still to vote</span>
    </div>
  );
}

export function Toasts() {
  const { state, dispatch } = useDemo();
  return (
    <div className="snacks" aria-live="polite">
      {state.toasts.slice(-3).map((t) => (
        <Toast key={t.id} text={t.text} done={() => dispatch({ type: 'TOAST_DONE', id: t.id })} />
      ))}
    </div>
  );
}
function Toast({ text, done }) {
  useEffect(() => {
    const id = setTimeout(done, 6000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="toast">
      <span>{text}</span>
      <button type="button" className="toast-x" onClick={done}>Dismiss</button>
    </div>
  );
}

// Shown when a page needs a role the presenter is not currently using.
export function RoleGate({ title, children }) {
  return (
    <Empty title={title}>
      <p>{children}</p>
      <p>Use the Demo panel (bottom right) to switch role.</p>
    </Empty>
  );
}
