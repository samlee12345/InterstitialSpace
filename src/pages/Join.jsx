import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Button, Choice, FileDrop, FormActions, Input, Page, Select, Steps } from '../components/ui.jsx';

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

// Architects: diploma first (required), then the licence. Licensed architects are
// looked up in their register and upload an ID that matches it; architects whose
// licence is pending can add an application or exam number if they have one.
function Architect({ status, onBack }) {
  const finish = useFinish();
  const licensed = status === 'licensed';
  const [f, setF] = useState({ school: SCHOOLS[0].name, year: '', diploma: [], country: 'India', name: '', number: '', email: '', docs: [] });
  const [lookup, setLookup] = useState('idle'); // idle | checking | found
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const reg = REGISTERS[f.country];
  const steps = licensed ? ['Diploma', 'Licence', 'Identity document', 'Account'] : ['Diploma', 'Licence (optional)', 'Account'];
  const account = steps.length - 1;
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); if (['country', 'name', 'number'].includes(k)) setLookup('idle'); };
  const go = (n) => { setErr(''); setStep(n); };

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
    return <div className="alert" role="status"><div className="row"><div className="spinner" aria-hidden="true" /><h2 className="h-sm">Checking your documents…</h2></div><p className="small muted">Simulated. You’ll be signed in as {licensed ? 'a licensed architect' : 'an architect with a licence pending'} in a moment.</p></div>;
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
          <FormActions>
            <Button onClick={onBack}>Back</Button>
            <Button variant="primary" onClick={() => (f.diploma.length && f.year.trim() ? go(1) : setErr('Add your graduation year and upload your diploma.'))}>Continue</Button>
          </FormActions>
        </div>
      )}
      {step === 1 && licensed && (
        <div className="stack">
          <Select label="Country where you are registered" value={f.country} onChange={set('country')} options={Object.keys(REGISTERS)} />
          <p className="small muted">We look you up in the {reg.body}.</p>
          <Input label="Name as it appears on the register" value={f.name} onChange={set('name')} autoComplete="name" />
          <Input label={reg.field} value={f.number} onChange={set('number')} placeholder={reg.example} hint={reg.example ? `For example ${reg.example}` : undefined} />
          {lookup === 'checking' && <p className="row small" role="status"><span className="spinner" aria-hidden="true" />Looking you up…</p>}
          {lookup === 'found' && <p className="note small" role="status">Found on the register: {f.name.trim()}, {f.number.trim()}, status active. (Simulated.)</p>}
          {err && <span className="error" role="alert">{err}</span>}
          <FormActions>
            <Button onClick={() => go(0)}>Back</Button>
            {lookup === 'found' ? <Button variant="primary" onClick={() => go(2)}>Continue</Button> : <Button variant="primary" onClick={check}>Look me up</Button>}
          </FormActions>
        </div>
      )}
      {step === 1 && !licensed && (
        <div className="stack">
          <p>If you’ve applied for your licence or are sitting the exam, add the number and we’ll check it when your licence comes through. You can skip this and add it later from your profile.</p>
          <Select label="Country you’re getting licensed in" value={f.country} onChange={set('country')} options={Object.keys(REGISTERS)} />
          <Input label="Application or exam number (optional)" value={f.number} onChange={set('number')} />
          <p className="small muted">Until your licence is confirmed your profile shows “Licence pending”. You can publish redesigns and enter contests open to students.</p>
          <FormActions>
            <Button onClick={() => go(0)}>Back</Button>
            <Button variant="primary" onClick={() => go(2)}>{f.number.trim() ? 'Continue' : 'Skip for now'}</Button>
          </FormActions>
        </div>
      )}
      {step === 2 && licensed && (
        <div className="stack">
          <p>Upload a government ID or your registration certificate. The name must match the register: <span className="bold">{f.name.trim()}</span>.</p>
          <FileDrop label="Identity document" files={f.docs} onChange={(docs) => setF({ ...f, docs })} samples={['passport-scan.pdf']} error={err} />
          <p className="xs muted">Used only to confirm the match, then deleted. Never shown on your profile.</p>
          <FormActions>
            <Button onClick={() => go(1)}>Back</Button>
            <Button variant="primary" onClick={() => (f.docs.length ? go(3) : setErr('Upload a document whose name matches the register.'))}>Continue</Button>
          </FormActions>
        </div>
      )}
      {step === account && (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); if (!f.email.includes('@')) return setErr('Enter an email address.'); setErr(''); return setDone(true); }}>
          <Input label="Email" type="email" value={f.email} onChange={set('email')} error={err} autoComplete="email" />
          <Input label="Password" type="password" autoComplete="new-password" />
          <FormActions>
            <Button onClick={() => go(step - 1)}>Back</Button>
            <Button variant="primary" type="submit">Create architect account</Button>
          </FormActions>
        </form>
      )}
    </div>
  );
}

function Student({ onBack }) {
  const finish = useFinish();
  const [f, setF] = useState({ email: '', code: '', school: SCHOOLS[0].name, year: '2028', docs: [] });
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const school = SCHOOLS.find((x) => x.name === f.school);
  return (
    <div className="stack">
      <Steps steps={['School email', 'Programme', 'Enrolment']} current={step} />
      {step === 0 && (
        <div className="stack">
          <Input label="School email address" type="email" value={f.email} onChange={set('email')} hint="Ends in .edu, .ac.in or .ac.uk, for example." autoComplete="email" />
          {sent && !verified && <Input label="6-digit code we emailed you" value={f.code} onChange={set('code')} inputMode="numeric" hint="Simulated: any 6 digits work." />}
          {verified && <p className="note small" role="status">School email confirmed.</p>}
          {err && <span className="error" role="alert">{err}</span>}
          <FormActions>
            <Button onClick={onBack}>Back</Button>
            {!sent && <Button variant="primary" onClick={() => { if (!SCHOOL_EMAIL.test(f.email.trim())) return setErr('Use your school email address, for example name@school.edu or name@school.ac.in.'); setErr(''); return setSent(true); }}>Send code</Button>}
            {sent && !verified && <Button variant="primary" onClick={() => { if (!/^\d{6}$/.test(f.code.trim())) return setErr('Enter the 6-digit code.'); setErr(''); return setVerified(true); }}>Confirm code</Button>}
            {verified && <Button variant="primary" onClick={() => setStep(1)}>Continue</Button>}
          </FormActions>
        </div>
      )}
      {step === 1 && (
        <div className="stack">
          <Select label="Your school" value={f.school} onChange={set('school')} options={SCHOOLS.map((x) => x.name)} />
          {school.programme
            ? <p className="note small" role="status">Accredited architecture programme found: {school.programme}. (Checked against the accreditation list; simulated.)</p>
            : <p className="note small">We’ll check your school’s architecture programme by hand.</p>}
          <Select label="Expected graduation year" value={f.year} onChange={set('year')} options={['2027', '2028', '2029', '2030', '2031']} hint="Student status ends then; you can verify as a licensed architect later." />
          <FormActions>
            <Button onClick={() => setStep(0)}>Back</Button>
            <Button variant="primary" onClick={() => setStep(2)}>Continue</Button>
          </FormActions>
        </div>
      )}
      {step === 2 && (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); if (!f.docs.length) return setErr('Upload your class registration or student ID.'); setErr(''); return finish('architect'); }}>
          <FileDrop label="Proof of enrolment this term (class registration or student ID)" files={f.docs} onChange={(docs) => setF({ ...f, docs })} samples={['fall-2026-registration.pdf']} error={err} />
          <Input label="Password" type="password" autoComplete="new-password" />
          <FormActions>
            <Button onClick={() => setStep(1)}>Back</Button>
            <Button variant="primary" type="submit">Create student account</Button>
          </FormActions>
        </form>
      )}
    </div>
  );
}

export function ForArchitects() {
  const { isMember } = useDemo();
  const [path, setPath] = useState(null);
  return (
    <Page narrow>
      <header className="stack-sm">
        <h1>For architects</h1>
        <p className="lede">Sell redesigns of real, documented spaces, keep 80% and your copyright, and enter funded contests. We verify every architect first.</p>
      </header>
      {isMember && <p className="note">You’re already signed in for this demo role. Switch to Visitor in the Demo bar to try this from scratch.</p>}
      {!path && (
        <fieldset className="stack-sm plain">
          <legend className="bold">Which describes you?</legend>
          <Choice name="arch" checked={false} onChange={() => setPath('arch')} title="I’m an architect">You have an architecture degree. We check your diploma, and your licence if you have one.</Choice>
          <Choice name="arch" checked={false} onChange={() => setPath('student')} title="I’m an architecture student">We check your school email, your programme’s accreditation and your enrolment.</Choice>
        </fieldset>
      )}
      {path === 'arch' && (
        <fieldset className="stack-sm plain">
          <legend className="bold">Are you licensed?</legend>
          <Choice name="licence" checked={false} onChange={() => setPath('licensed')} title="Licensed">You’re on your country’s register. We look you up and match it to your ID.</Choice>
          <Choice name="licence" checked={false} onChange={() => setPath('pending')} title="Licence pending">You’ve graduated and are working towards your licence. Add your application number if you have one.</Choice>
          <div><Button onClick={() => setPath(null)}>Back</Button></div>
        </fieldset>
      )}
      {(path === 'licensed' || path === 'pending') && <Architect key={path} status={path} onBack={() => setPath('arch')} />}
      {path === 'student' && <Student onBack={() => setPath(null)} />}
      <p className="small muted">Not an architect? <Link to="/signup">Create a free community account</Link>. Already have an account? <Link to="/login">Log in</Link></p>
    </Page>
  );
}

export function Login() {
  const { dispatch, state } = useDemo();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
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
        <Input label="Password" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" error={err} hint="Simulated: any email and password sign you in as Community member 1." />
        <FormActions><Button variant="primary" type="submit">Log in</Button></FormActions>
      </form>
      <p className="small muted">New here? <Link to="/signup">Create a free community account</Link>, or <Link to="/architects">get verified as an architect</Link>.</p>
    </Page>
  );
}
