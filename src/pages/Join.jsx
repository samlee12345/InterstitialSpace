import { createContext, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Button, DemoOnly, FileDrop, FormActions, Input, Page, Select, Steps } from '../components/ui.jsx';

/* For architects: verification before an architect account is created.
 * Professional: country → national register lookup → ID document matching the
 *   registered name. Student: school email code → accredited programme check →
 *   proof of enrolment. All checks are simulated in the prototype. */

// Registers by country. Real bodies; the lookups here are simulated.
const REGISTERS = {
  India: { body: 'Council of Architecture (CoA) register', field: 'CoA registration number', example: 'CA/2016/12345' },
  'United States': { body: 'your state licensing board, via NCARB', field: 'State licence number', example: 'NY 041234' },
  'United Kingdom': { body: 'Architects Registration Board (ARB) register', field: 'ARB registration number', example: '081234A' },
  Other: { body: 'your national register (checked by the team by hand)', field: 'Registration number', example: '' },
};
const SCHOOLS = [
  { name: 'Aayojan School of Architecture, Jaipur', programme: 'B.Arch, approved by the Council of Architecture' },
  { name: 'Malaviya National Institute of Technology, Jaipur', programme: 'B.Arch, approved by the Council of Architecture' },
  { name: 'Parsons School of Design, New York', programme: 'Master of Architecture, NAAB accredited' },
  { name: 'Other school', programme: null },
];
const SCHOOL_EMAIL = /@([a-z0-9-]+\.)*(edu|ac\.in|ac\.uk|edu\.in)$/i;

function useFinish() {
  const { dispatch, state } = useDemo();
  const nav = useNavigate();
  return (kind) => {
    dispatch({ type: 'SIGNUP', kind });
    const back = state.returnTo || '/browse';
    dispatch({ type: 'CLEAR_RETURN' });
    nav(back);
  };
}

// The step's buttons render into the fixed footer of the page, so they stay put
// when hints or errors appear above them. Submit buttons use form="…".
const SlotContext = createContext(null);
function Actions({ children }) {
  const slot = useContext(SlotContext);
  return slot ? createPortal(<FormActions>{children}</FormActions>, slot) : null;
}

// Last step for everyone: who you are and how you sign in.
function AccountDetails({ id, initial, emailLocked, onDone, onBack, submitLabel }) {
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '', website: '', linkedin: '', ...initial });
  const [err, setErr] = useState({});
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); if (err[k]) setErr({ ...err, [k]: undefined }); };
  const submit = (e) => {
    e.preventDefault();
    const x = {};
    if (!f.name.trim()) x.name = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) x.email = 'Enter an email address, like name@example.com.';
    if (f.password.length < 8) x.password = 'Use at least 8 characters.';
    if (!x.password && f.confirm !== f.password) x.confirm = 'The passwords don’t match.';
    setErr(x);
    if (!Object.keys(x).length) onDone(f);
  };
  return (
    <form id={id} className="stack" onSubmit={submit} noValidate>
      <p className="small muted">This is what clients and other members see on your architect page. Fields marked * are required.</p>
      <Input label={<>Full name<Req /></>} value={f.name} onChange={set('name')} autoComplete="name" error={err.name} />
      <Input label={<>Email<Req /></>} type="email" value={f.email} onChange={set('email')} autoComplete="email" readOnly={emailLocked} hint={emailLocked ? 'Your confirmed school email. You can add a personal one later in your profile.' : undefined} error={err.email} />
      <Input label={<>Create password<Req /></>} type="password" value={f.password} onChange={set('password')} autoComplete="new-password" hint="At least 8 characters." error={err.password} />
      <Input label={<>Confirm password<Req /></>} type="password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" error={err.confirm} />
      <div className="field-row">
        <Input label="Website" optional inputMode="url" value={f.website} onChange={set('website')} placeholder="yourstudio.com" autoComplete="url" />
        <Input label="LinkedIn" optional inputMode="url" value={f.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/your-name" />
      </div>
      <Actions>
        <Button onClick={onBack}>Back</Button>
        <Button variant="primary" type="submit" form={id}>{submitLabel}</Button>
      </Actions>
    </form>
  );
}
const Req = () => (<><span className="req" aria-hidden="true"> *</span><span className="visually-hidden"> (required)</span></>);

// Architects: diploma first (required), then the licence. Licensed architects are
// looked up in their register and upload an ID that matches it; architects whose
// licence is pending can add an application or exam number if they have one.
function Architect({ status, onBack }) {
  const finish = useFinish();
  const licensed = status === 'licensed';
  const [f, setF] = useState({ school: SCHOOLS[0].name, year: '', diploma: [], country: 'India', name: '', number: '', docs: [] });
  const [lookup, setLookup] = useState('idle'); // idle | checking | found
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const reg = REGISTERS[f.country];
  const steps = licensed ? ['Diploma', 'Licence', 'Identity document', 'Your account'] : ['Diploma', 'Licence', 'Your account'];
  const account = steps.length - 1;
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); if (['country', 'name', 'number'].includes(k)) setLookup('idle'); };
  const go = (n) => { setErr(''); setStep(n); window.scrollTo(0, 0); };

  useEffect(() => {
    if (lookup !== 'checking') return undefined;
    const t = setTimeout(() => setLookup('found'), 1100);
    return () => clearTimeout(t);
  }, [lookup]);
  useEffect(() => {
    if (!done) return undefined;
    const t = setTimeout(() => finish('architect'), 1600);
    return () => clearTimeout(t);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const check = () => {
    if (!f.name.trim() || !f.number.trim()) return setErr('Enter your name as registered and your registration number.');
    setErr('');
    return setLookup('checking');
  };
  if (done) {
    return <div className="alert" role="status"><div className="row"><div className="spinner" aria-hidden="true" /><h2 className="h-sm">Checking your documents…</h2></div><p className="small muted">You’ll be signed in as {licensed ? 'a licensed architect' : 'an architect with a licence pending'} in a moment.</p></div>;
  }
  return (
    <div className="stack">
      <Steps steps={steps} current={step} />
      {step === 0 && (
        <div className="stack">
          <p>Upload your architecture degree. Every architect on the platform needs one.</p>
          <Select label="School you graduated from" value={f.school} onChange={set('school')} options={SCHOOLS.map((x) => x.name)} />
          <Input label="Year of graduation" inputMode="numeric" value={f.year} onChange={set('year')} placeholder="e.g. 2021" />
          <FileDrop label="Diploma or degree certificate" files={f.diploma} onChange={(diploma) => { setF({ ...f, diploma }); setErr(''); }} samples={['b-arch-diploma.pdf']} error={err} />
          <Actions>
            <Button onClick={onBack}>Back</Button>
            <Button variant="primary" onClick={() => (f.diploma.length && f.year.trim() ? go(1) : setErr('Add your graduation year and upload your diploma.'))}>Next</Button>
          </Actions>
        </div>
      )}
      {step === 1 && licensed && (
        <div className="stack">
          <Select label="Country where you are registered" value={f.country} onChange={set('country')} options={Object.keys(REGISTERS)} />
          <p className="small muted">We look you up in the {reg.body}.</p>
          <Input label="Name as it appears on the register" value={f.name} onChange={set('name')} autoComplete="name" />
          <Input label={reg.field} value={f.number} onChange={set('number')} placeholder={reg.example} hint={reg.example ? `For example ${reg.example}` : undefined} />
          {lookup === 'checking' && <p className="row small" role="status"><span className="spinner" aria-hidden="true" />Looking you up…</p>}
          {lookup === 'found' && <p className="note small" role="status">Found on the register: {f.name.trim()}, {f.number.trim()}, status active.</p>}
          {err && <span className="error" role="alert">{err}</span>}
          <Actions>
            <Button onClick={() => go(0)}>Back</Button>
            {lookup === 'found' ? <Button variant="primary" onClick={() => go(2)}>Next</Button> : <Button variant="primary" onClick={check} disabled={lookup === 'checking'}>Look me up</Button>}
          </Actions>
        </div>
      )}
      {step === 1 && !licensed && (
        <div className="stack">
          <p>If you’ve applied for your licence or are sitting the exam, add the number and we’ll check it when your licence comes through. You can skip this and add it later from your profile.</p>
          <Select label="Country you’re getting licensed in" value={f.country} onChange={set('country')} options={Object.keys(REGISTERS)} />
          <Input label="Application or exam number" optional value={f.number} onChange={set('number')} />
          <p className="small muted">Until your licence is confirmed your profile shows “Licence pending”. You can publish redesigns and enter contests open to students.</p>
          <Actions>
            <Button onClick={() => go(0)}>Back</Button>
            <Button variant="primary" onClick={() => go(2)}>{f.number.trim() ? 'Next' : 'Skip for now'}</Button>
          </Actions>
        </div>
      )}
      {step === 2 && licensed && (
        <div className="stack">
          <p>Upload a government ID or your registration certificate. The name must match the register: <span className="bold">{f.name.trim()}</span>.</p>
          <FileDrop label="Identity document" files={f.docs} onChange={(docs) => { setF({ ...f, docs }); setErr(''); }} samples={['passport-scan.pdf']} error={err} />
          <p className="xs muted">Used only to confirm the match, then deleted. Never shown on your profile.</p>
          <Actions>
            <Button onClick={() => go(1)}>Back</Button>
            <Button variant="primary" onClick={() => (f.docs.length ? go(3) : setErr('Upload a document whose name matches the register.'))}>Next</Button>
          </Actions>
        </div>
      )}
      {step === account && (
        <AccountDetails id="arch-account" initial={{ name: f.name }} onBack={() => go(step - 1)} onDone={() => setDone(true)} submitLabel="Create architect account" />
      )}
    </div>
  );
}

// Students: school email (code sent inline, checked as soon as 6 digits are in),
// then programme and this term's class registration, then the account.
function Student({ onBack }) {
  const finish = useFinish();
  const [f, setF] = useState({ email: '', code: '', school: SCHOOLS[0].name, year: '2028', docs: [] });
  const [codeState, setCodeState] = useState('none'); // none | sent | checking | verified
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const school = SCHOOLS.find((x) => x.name === f.school);
  const go = (n) => { setErr(''); setStep(n); window.scrollTo(0, 0); };

  useEffect(() => {
    if (codeState !== 'checking') return undefined;
    const t = setTimeout(() => setCodeState('verified'), 700);
    return () => clearTimeout(t);
  }, [codeState]);

  const send = () => {
    if (!SCHOOL_EMAIL.test(f.email.trim())) return setErr('Use your school email address, for example name@school.edu or name@school.ac.in.');
    setErr('');
    setF({ ...f, code: '' });
    return setCodeState('sent');
  };
  const onCode = (e) => {
    const code = e.target.value.replace(/\D/g, '').slice(0, 6);
    setF({ ...f, code });
    setErr('');
    // Checked automatically once all six digits are typed. Simulated: any 6 digits work.
    if (code.length === 6) setCodeState('checking');
    else if (codeState !== 'none') setCodeState('sent');
  };
  return (
    <div className="stack">
      <Steps steps={['School email', 'School and enrolment', 'Your account']} current={step} />
      {step === 0 && (
        <div className="stack">
          <div className="field">
            <label htmlFor="school-email" className="label">School email address</label>
            <div className="input-with-button">
              <input
                id="school-email"
                className="input"
                type="email"
                autoComplete="email"
                value={f.email}
                readOnly={codeState === 'verified'}
                onChange={(e) => { setF({ ...f, email: e.target.value }); if (codeState !== 'none') setCodeState('none'); }}
                aria-describedby="school-email-hint"
              />
              {codeState !== 'verified' && <Button onClick={send}>{codeState === 'none' ? 'Send code' : 'Resend code'}</Button>}
            </div>
            <span id="school-email-hint" className="small muted">Ends in .edu, .ac.in or .ac.uk, for example.</span>
          </div>
          {codeState === 'sent' && <DemoOnly><p className="demo-note">Any 6 digits work as the code.</p></DemoOnly>}
          {codeState !== 'none' && (
            <div className="field">
              <label htmlFor="school-code" className="label">6-digit code we emailed you</label>
              <input id="school-code" className="input input-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={f.code} onChange={onCode} readOnly={codeState === 'verified'} aria-describedby="school-code-status" autoFocus />
              <span id="school-code-status" className="small muted" role="status">
                {codeState === 'sent' && `Sent to ${f.email.trim()}.`}
                {codeState === 'checking' && 'Checking the code…'}
                {codeState === 'verified' && <span className="ok">✓ School email confirmed.</span>}
              </span>
            </div>
          )}
          {err && <span className="error" role="alert">{err}</span>}
          <Actions>
            <Button onClick={onBack}>Back</Button>
            <Button variant="primary" disabled={codeState !== 'verified'} onClick={() => go(1)}>Next</Button>
          </Actions>
        </div>
      )}
      {step === 1 && (
        <div className="stack">
          <Select label="Your school" value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} options={SCHOOLS.map((x) => x.name)} />
          {school.programme
            ? <p className="note small" role="status">Accredited architecture programme found: {school.programme}.</p>
            : <p className="note small">We’ll check your school’s architecture programme by hand.</p>}
          <Select label="Expected graduation year" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} options={['2027', '2028', '2029', '2030', '2031']} hint="Student status ends then; you can verify as a licensed architect later." />
          <FileDrop
            label="Class registration for this term"
            files={f.docs}
            onChange={(docs) => { setF({ ...f, docs }); setErr(''); }}
            samples={['fall-2026-registration.pdf']}
            error={err}
          />
          <p className="xs muted">Proof you’re enrolled this term in an architecture programme. We check that it lists architecture courses. A student ID alone isn’t enough.</p>
          <Actions>
            <Button onClick={() => go(0)}>Back</Button>
            <Button variant="primary" onClick={() => (f.docs.length ? go(2) : setErr('Upload your class registration for this term.'))}>Next</Button>
          </Actions>
        </div>
      )}
      {step === 2 && (
        <AccountDetails id="student-account" initial={{ email: f.email.trim() }} emailLocked onBack={() => go(1)} onDone={() => finish('architect')} submitLabel="Create student account" />
      )}
    </div>
  );
}

// A choice that moves you on: the whole card is a button, no radio.
function PathCard({ title, children, onClick }) {
  return (
    <button type="button" className="path-card" onClick={onClick}>
      <span className="stack-sm">
        <span className="bold">{title}</span>
        <span className="small muted">{children}</span>
      </span>
      <span className="path-card-arrow" aria-hidden="true">›</span>
    </button>
  );
}

export function ForArchitects() {
  const { isMember, isArchitect } = useDemo();
  const converting = new URLSearchParams(useLocation().search).get('convert') === '1' && isMember && !isArchitect;
  const [path, setPath] = useState(null);
  const [slot, setSlot] = useState(null);
  return (
    <Page narrow>
      <SlotContext.Provider value={slot}>
        <div className="flow">
          <header className="stack-sm">
            <h1>For architects</h1>
            <p className="lede">Sell redesigns of real, documented spaces, keep 80% and your copyright, and enter funded contests. We verify every architect first.</p>
          </header>
          {converting && <p className="note">You’re converting your community account. Your points, contributions and purchases stay with you; you get verified as an architect on top.</p>}
          {isMember && !converting && <DemoOnly><p className="demo-note">You’re signed in. Switch to Visitor in Demo controls to try sign-up from scratch.</p></DemoOnly>}
          {!path && (
            <section className="stack-sm" aria-labelledby="path-q">
              <h2 id="path-q" className="h-xs">Which describes you?</h2>
              <PathCard title="I’m an architect" onClick={() => setPath('arch')}>You have an architecture degree. We check your diploma, and your licence if you have one.</PathCard>
              <PathCard title="I’m an architecture student" onClick={() => setPath('student')}>We check your school email, your programme’s accreditation and this term’s class registration.</PathCard>
            </section>
          )}
          {path === 'arch' && (
            <section className="stack-sm" aria-labelledby="licence-q">
              <h2 id="licence-q" className="h-xs">Are you licensed?</h2>
              <PathCard title="Licensed" onClick={() => setPath('licensed')}>You’re on your country’s register. We look you up and match it to your ID.</PathCard>
              <PathCard title="Licence pending" onClick={() => setPath('pending')}>You’ve graduated and are working towards your licence. Add your application number if you have one.</PathCard>
              <Actions><Button onClick={() => setPath(null)}>Back</Button></Actions>
            </section>
          )}
          {(path === 'licensed' || path === 'pending') && <Architect key={path} status={path} onBack={() => setPath('arch')} />}
          {path === 'student' && <Student onBack={() => setPath(null)} />}
          <div className="flow-foot">
            <div ref={setSlot} className="flow-actions" />
            <p className="small muted">Not an architect? <Link to="/signup">Create a free community account</Link>. Already have an account? <Link to="/login">Log in</Link></p>
          </div>
        </div>
      </SlotContext.Provider>
    </Page>
  );
}

export function Login() {
  const { dispatch, state } = useDemo();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '', remember: false });
  const [err, setErr] = useState('');
  return (
    <Page narrow>
      <h1>Log in</h1>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.email.includes('@') || !f.password) return setErr('Enter your email and password.');
          dispatch({ type: 'SIGNUP', kind: 'community' });
          const back = state.returnTo || '/browse';
          dispatch({ type: 'CLEAR_RETURN' });
          return nav(back);
        }}
      >
        <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" />
        <Input label="Password" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" error={err} />
        <DemoOnly><p className="demo-note">Any email and password sign you in as Community member 1.</p></DemoOnly>
        <label className="check-row">
          <input type="checkbox" checked={f.remember} onChange={(e) => setF({ ...f, remember: e.target.checked })} />
          <span>Remember me</span>
          <span className="xs muted">Stay signed in on this device for 30 days. Leave it off on a shared computer.</span>
        </label>
        <FormActions><Button variant="primary" type="submit">Log in</Button></FormActions>
      </form>
      <p className="small muted">
        New here? <Link to="/membership">Create an account</Link>, or{' '}
        <span className="tip">
          <Link to="/architects" aria-describedby="arch-tip">get verified as an architect</Link>
          <span id="arch-tip" role="tooltip" className="tip-bubble">You can join as a licensed architect, an architect whose licence is pending, or an architecture student.</span>
        </span>.
      </p>
    </Page>
  );
}
