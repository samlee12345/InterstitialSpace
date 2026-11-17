import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { fmtPoints } from '../lib/points.js';

export function Button({ variant = 'default', to, className = '', ...p }) {
  const cls = `btn btn-${variant} ${className}`;
  return to ? <Link className={cls} to={to} {...p} /> : <button type="button" className={cls} {...p} />;
}

// Corner tag: is this screen fully working or a simulation?
export function ScreenTag({ kind }) {
  return <div className={`screentag screentag-${kind}`}>{kind === 'clickable' ? 'CLICKABLE' : 'SIMULATED'}</div>;
}

export function Page({ tag, narrow, wide, children }) {
  return (
    <main className={`page stack-lg ${narrow ? 'narrow' : ''} ${wide ? 'page-wide' : ''}`}>
      {tag && <ScreenTag kind={tag} />}
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

export function Badge({ kind = '', children }) {
  return <span className={`badge ${kind ? `badge-${kind}` : ''}`}>{children}</span>;
}

// Points are shown to signed-in members only, never to visitors.
export function PointsBadge({ userId }) {
  const { isMember, get } = useDemo();
  const u = get.user(userId);
  if (!isMember || !u) return null;
  return (
    <>
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
      {space.readyForApproval && <Badge>Ready for approval</Badge>}
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
export function FileDrop({ label, files, onChange, samples = ['drawings.pdf', 'model.3dm'], error }) {
  const ref = useRef(null);
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="drop">
        <div className="row">
          <Button onClick={() => ref.current.click()}>Choose files</Button>
          <Button variant="quiet" onClick={() => onChange([...new Set([...files, ...samples])])}>Use sample files</Button>
          <input ref={ref} type="file" multiple hidden aria-label={label} onChange={(e) => onChange([...files, ...[...e.target.files].map((f) => f.name)])} />
        </div>
        {files.length === 0 ? (
          <span className="small muted">No files yet. Nothing is uploaded anywhere — the prototype only keeps file names.</span>
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
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" type="button" className="tab" aria-selected={active === t.id} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Steps({ steps, current }) {
  return (
    <ol className="steps">
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? 'step' : undefined} className={i < current ? 'done' : ''}>{s}</li>
      ))}
    </ol>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
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
