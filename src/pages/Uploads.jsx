import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Button, Choice, Empty, FileDrop, FormActions, ImageBox, Input, Page, RoleGate, Select, Steps } from '../components/ui.jsx';
import { Collaborators, Crumbs, ELIGIBILITY } from '../components/domain.jsx';
import { useChoices } from '../design/choices.js';
import { POINTS } from '../lib/points.js';

function Guard({ children }) {
  const { id } = useParams();
  const { get, isArchitect } = useDemo();
  const space = get.space(id);
  if (!space || space.removed) return <Page narrow><Empty title="Space not found"><div><Button to="/browse">Browse spaces</Button></div></Empty></Page>;
  if (!isArchitect) {
    return (
      <Page narrow tag="clickable">
        <RoleGate title="Architects only">Only licensed architects and accredited students can upload here.</RoleGate>
        <div><Button to={`/space/${space.id}`}>Back to the space</Button></div>
      </Page>
    );
  }
  return children(space);
}

function SpaceSummary({ space }) {
  return (
    <div className="card sunken">
      <span className="small muted">Space (preselected)</span>
      <span className="bold">{space.name}</span>
      <span className="small muted">{space.type}, {space.photos.length} photos</span>
    </div>
  );
}

// Redesigns are CAD and 3D model files only.
export const REDESIGN_FILES = ['.dwg', '.dxf', '.skp', '.3dm'];

const Req = () => (<><span className="req" aria-hidden="true"> *</span><span className="visually-hidden"> (required)</span></>);

// One flow for both: a redesign for the Redesign Library, or an entry to a live contest (?contest=id).
function RedesignForm({ space, contestId: fromRoute }) {
  const { state, dispatch, user, cfg, uploadLimit, get } = useDemo();
  const nav = useNavigate();
  const contestId = fromRoute || new URLSearchParams(useLocation().search).get('contest');
  const contest = contestId ? get.contest(contestId) : null;
  // Contest entries have their own two-round flow now; the redesign form only publishes redesigns.
  const isEntry = false;
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ title: '', description: '', files: [], units: '', agency: true, attest: false, collaborators: [] });
  const [err, setErr] = useState({});
  const [from, setFrom] = useState('new'); // contest entries: 'new' or the id of one of your redesigns
  const limit = uploadLimit(user.id, space.id);
  const mine = state.redesigns.filter((r) => r.spaceId === space.id && r.architectId === user.id && r.published && !r.takenDown && !r.archived);
  const steps = isEntry ? ['Files and description', 'Details and terms', 'Prize'] : ['Files and description', 'Details and terms', 'Price and payout'];
  const crumbs = isEntry
    ? [['/contests', 'Contests'], [`/contest/${contest.id}`, contest.title], [null, 'Submit an entry']]
    : [['/browse', 'Browse spaces'], [`/space/${space.id}`, space.name], [null, 'Upload redesign']];
  // Entering with a published redesign copies its files and details; everything stays editable.
  const pick = (id) => {
    setFrom(id);
    setErr({});
    if (id === 'new') { setF({ ...f, title: '', description: '', files: [], units: '' }); return; }
    const r = mine.find((x) => x.id === id);
    setF({ ...f, title: r.title, description: r.description, files: r.files.filter((x) => REDESIGN_FILES.some((e) => x.endsWith(e))), units: r.details?.units || '' });
  };

  if (contest && !isEntry) {
    return <Page narrow><Empty title="This contest isn’t open for entries"><div><Button to={`/contest/${contest.id}`}>Back to the contest</Button></div></Empty></Page>;
  }
  if (isEntry && contest.entries.some((e) => e.architectId === user.id)) {
    return <Page narrow><Empty title="You’ve already entered this contest"><div><Button to={`/contest/${contest.id}`}>Back to the contest</Button></div></Empty></Page>;
  }
  if (!isEntry && !limit.allowed) {
    return (
      <Page narrow>
        <Crumbs items={crumbs} />
        <Empty title="One redesign per space each week">
          <p>You published a redesign for this space this week, so points reflect considered work. You can add another here on {limit.next.toLocaleDateString()}.</p>
          <p>You can upload to other spaces now, and edit the redesigns you have published.</p>
          <div className="row"><Button to="/browse">Browse spaces</Button><Button to={`/space/${space.id}`}>Back to the space</Button></div>
        </Empty>
      </Page>
    );
  }

  const check0 = () => {
    const e = {};
    if (!f.title.trim()) e.title = 'Give the design a title.';
    if (f.description.trim().length < 20) e.description = 'Describe it in at least a sentence (20 characters).';
    if (f.files.length === 0) e.files = 'Add at least one file.';
    return e;
  };
  const check1 = () => {
    const e = {};
    if (!f.units) e.units = 'Choose the measurement units.';
    if (!f.attest) e.attest = 'Read the terms and confirm them to continue.';
    return e;
  };
  const next = (n, check) => () => {
    const e = check ? check() : {};
    setErr(e);
    if (!Object.keys(e).length) { setStep(n); window.scrollTo(0, 0); }
  };
  // Fixing a field clears its error.
  const upd = (patch) => { setF({ ...f, ...patch }); setErr(Object.fromEntries(Object.entries(err).filter(([k]) => !(k in patch)))); };
  const details = { units: f.units, agency: isEntry ? false : f.agency };

  const finish = () => {
    const title = f.title.trim();
    if (isEntry) {
      const entry = { id: `e-${Date.now()}`, submittedAt: new Date().toISOString().slice(0, 10), architectId: user.id, title, statement: f.description.trim(), files: f.files, fromRedesign: from === 'new' ? null : from, collaborators: f.collaborators, ...details };
      dispatch({ type: 'SUBMIT_ENTRY', contestId: contest.id, entry });
      return nav(`/space/${space.id}`, { replace: true, state: { banner: { title: 'Contest entry submitted', text: `“${title}” is entered in “${contest.title}”. The co-host judges after ${contest.deadline}; you’ll get a notification with the result.`, links: [[`/contest/${contest.id}`, 'Contest details'], ['/portfolio', 'Open your portfolio']] } } });
    }
    dispatch({ type: 'PUBLISH_REDESIGN', id: `r-${Date.now()}`, spaceId: space.id, userId: user.id, title, description: f.description.trim(), files: f.files, details, collaborators: f.collaborators });
    return nav(`/space/${space.id}?tab=redesigns`, {
      replace: true,
      state: { banner: { title: 'Redesign published', text: `“${title}” is live on this space, marked “Yours”. You earned ${POINTS.redesign} points. It also appears in your portfolio and the architect ranking.`, links: [['/portfolio', 'Open your portfolio'], ['/ranking', 'See the ranking']] } },
    });
  };

  return (
    <Page narrow>
      <Crumbs items={crumbs} />
      <h1>{isEntry ? `Enter “${contest.title}”` : 'Upload a redesign'}</h1>
      <p className="small muted">For {space.name}{isEntry ? `. Prize ${contest.prize}; every entry is paid ${contest.entryPay}. Entries close ${contest.deadline}.` : '.'}</p>
      <Steps steps={steps} current={step} />

      {step === 0 && (
        <div className="stack">
          {isEntry && mine.length > 0 && (
            <fieldset className="stack-sm">
              <legend className="h-xs">Start from</legend>
              <p className="small muted">You’ve published {mine.length === 1 ? 'a redesign' : 'redesigns'} for this space. Enter {mine.length === 1 ? 'it' : 'one of them'}, or upload a new design.</p>
              <div className="pick-list">
                {mine.map((r) => (
                  <label key={r.id} className={`pick ${from === r.id ? 'pick-on' : ''}`}>
                    <input type="radio" name="from" checked={from === r.id} onChange={() => pick(r.id)} />
                    <span className="pick-img"><ImageBox label="Redesign" shape="square" /></span>
                    <span className="stack-sm">
                      <span className="bold">{r.title}</span>
                      <span className="small muted">Published {new Date(r.createdAt).toLocaleDateString()}{r.files?.length ? `, ${r.files.length} files` : ''}</span>
                    </span>
                  </label>
                ))}
                <label className={`pick ${from === 'new' ? 'pick-on' : ''}`}>
                  <input type="radio" name="from" checked={from === 'new'} onChange={() => pick('new')} />
                  <span className="stack-sm">
                    <span className="bold">Upload a new design</span>
                    <span className="small muted">Start with empty fields</span>
                  </span>
                </label>
              </div>
              {from !== 'new' && <p className="note small">The files and details are copied from your redesign. Adjust them for the brief if you need to. Your redesign stays on sale in the library; people who already bought it keep their licence.</p>}
            </fieldset>
          )}
          <p className="xs muted">Fields marked * are required.</p>
          <Input label={<>Title<Req /></>} value={f.title} onChange={(e) => upd({ title: e.target.value })} error={err.title} placeholder="e.g. Shaded seating along the lower steps" />
          <Input label={<>Description<Req /></>} textarea value={f.description} onChange={(e) => upd({ description: e.target.value })} error={err.description} hint={isEntry ? 'How your design meets the co-host’s criteria.' : 'What changes, and which resident requests it answers.'} />
          <FileDrop label={<>Design files: CAD drawings and 3D model<Req /></>} files={f.files} onChange={(files) => upd({ files })} error={err.files} accept={REDESIGN_FILES} samples={['drawings.dwg', 'model.skp']} />
          <Collaborators value={f.collaborators} onChange={(collaborators) => setF({ ...f, collaborators })} />
          <FormActions>
            <Button to={isEntry ? `/contest/${contest.id}` : `/space/${space.id}`}>Cancel</Button>
            <Button variant="primary" onClick={next(1, check0)}>Continue</Button>
          </FormActions>
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          <p className="xs muted">Fields marked * are required.</p>
          <fieldset className="chips-field">
            <legend>Measurement units<Req /></legend>
            <div className="chips">
              {['Metric (m / mm)', 'Imperial (ft / in)'].map((u) => (
                <label key={u} className="chip"><input type="radio" name="units" checked={f.units === u} onChange={() => upd({ units: u })} /><span>{u}</span></label>
              ))}
            </div>
            {err.units && <span className="error" role="alert">{err.units}</span>}
          </fieldset>
          {!isEntry && (
            <Choice type="checkbox" checked={f.agency} onChange={(e) => setF({ ...f, agency: e.target.checked })} title="Let agencies and civic bodies contact me about buying expanded or exclusive implementation rights">
              Price and terms are agreed between you and them, and you must be credited.
            </Choice>
          )}
          <section className="card stack terms-box" aria-labelledby="terms-h">
            <h2 id="terms-h" className="h-sm">{isEntry ? 'Contest terms' : 'Terms and conditions'}</h2>
            {isEntry ? (
              <dl className="dl dl-wide">
                <dt>Original work</dt><dd>Your entry is your own work, doesn’t infringe anyone else’s rights, and is a schematic design, not stamped construction documents.</dd>
                <dt>Payment for entering</dt><dd>{contest.entryPay}, paid when your complete entry is accepted, win or lose.</dd>
                <dt>If you win</dt><dd>You also receive the {contest.prize} prize and sell the design rights to {contest.coHost} at the sale price it set.</dd>
                <dt>If you don’t win</dt><dd>You keep full copyright to your entry.</dd>
                <dt>Judging</dt><dd>By the co-host, against its criteria, after {contest.deadline}. Entries stay private until the winner is announced.</dd>
                <dt>Liability</dt><dd>Code compliance and engineering sign-off are the co-host’s responsibility when it builds.</dd>
              </dl>
            ) : (
              <dl className="dl dl-wide">
                <dt>Original work</dt><dd>Your redesign is your own work, doesn’t infringe anyone else’s rights, and is a schematic design, not stamped construction documents.</dd>
                <dt>Copyright</dt><dd>You keep full copyright. If the platform ever shuts down, your work remains yours.</dd>
                <dt>What buyers get</dt><dd>A non-exclusive Platform Purchase Licence to download, use and adapt the files. They can’t redistribute or resell them.</dd>
                <dt>Revenue split</dt><dd>You earn 80% of every download; the platform keeps 20%. Prices are set by the platform.</dd>
                <dt>Credit</dt><dd>Any agency that buys further rights to build your design must credit you as the architect.</dd>
                <dt>Editing</dt><dd>Edit your files and description, or unpublish, anytime from your portfolio. Existing buyers keep their download links, which never expire.</dd>
                <dt>Liability</dt><dd>Uploads are schematic proposals. Local code compliance and engineering sign-off are the implementing buyer’s responsibility.</dd>
              </dl>
            )}
            <Link className="small" to="/terms">Full Terms of Use</Link>
          </section>
          <div className={`attest ${err.attest ? 'attest-error' : ''}`}>
            <Choice type="checkbox" checked={f.attest} onChange={(e) => upd({ attest: e.target.checked })} title={<>I have read and agree to these terms<Req /></>} />
            {err.attest && <span className="error" role="alert">{err.attest}</span>}
          </div>
          <FormActions>
            <Button onClick={() => setStep(0)}>Back</Button>
            <Button variant="primary" onClick={next(2, check1)}>Continue</Button>
          </FormActions>
        </div>
      )}

      {step === 2 && (
        <div className="stack">
          {isEntry ? (
            <section className="card stack" aria-labelledby="prize-h">
              <h2 id="prize-h" className="h-sm">Prize</h2>
              <dl className="dl">
                <dt>Prize</dt><dd>{contest.prize}, to the winner.</dd>
                <dt>Every entry is paid</dt><dd>{contest.entryPay}, win or lose.</dd>
                <dt>If you win</dt><dd>You sell the design rights to {contest.coHost}, at the sale price the co-host sets.</dd>
                <dt>If you don’t win</dt><dd>You keep full copyright to your entry.</dd>
                <dt>Judging</dt><dd>By the co-host, against its criteria, after {contest.deadline}.</dd>
              </dl>
            </section>
          ) : (
            <>
              <section className="card stack" aria-labelledby="price-h">
                <h2 id="price-h" className="h-sm">Price and payout</h2>
                <dl className="dl">
                  <dt>Listing price</dt><dd><span className="bold">{cfg.priceLabel}</span>, the same for every redesign, set by the platform</dd>
                  <dt>Your earnings</dt><dd>80% of each download ({cfg.priceLabel} × 80%). The platform keeps 20%.</dd>
                  <dt>Contribution reward</dt><dd>+{POINTS.redesign} points to your profile and architect ranking when you publish</dd>
                </dl>
              </section>
            </>
          )}
          <div className="card sunken">
            <span className="bold">{f.title}</span>
            <span className="small">{f.description}</span>
            <span className="small muted">{f.units}. Files: {f.files.join(', ')}</span>
          </div>
          <FormActions>
            <Button onClick={() => setStep(1)}>Back</Button>
            <Button variant="primary" onClick={finish}>{isEntry ? 'Submit entry' : 'Publish'}</Button>
          </FormActions>
        </div>
      )}
    </Page>
  );
}

// Spatial diagram: files first (previews appear once uploaded), then the licence,
// because diagrams are sold as downloads from the Base Library.
const isDrawing = (f) => /\.(dwg|dxf|pdf|png|jpe?g|svg)$/i.test(f);
const drawingLabel = (f) => (/section/i.test(f) ? 'Section' : /plan/i.test(f) ? 'Plan' : 'Drawing');

function DiagramForm({ space }) {
  const { dispatch, user, cfg } = useDemo();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState([]);
  const [notes, setNotes] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [measured, setMeasured] = useState(false);
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState({});
  const drawings = files.filter(isDrawing);

  const check0 = () => {
    const e = {};
    if (drawings.length < 2) e.files = 'Add a plan and a section (DWG, DXF, PDF or image).';
    if (!measured) e.measured = 'Confirm the drawing is measured.';
    return e;
  };
  const toTerms = () => {
    const e = check0();
    setErr(e);
    if (!Object.keys(e).length) { setStep(1); window.scrollTo(0, 0); }
  };
  const submit = () => {
    if (!agree) { setErr({ agree: 'Agree to the Base Library licence to add your diagram.' }); return; }
    dispatch({ type: 'UPLOAD_DIAGRAM', spaceId: space.id, userId: user.id, files, notes, collaborators, modelId: `m-${Date.now()}` });
    nav(`/space/${space.id}?tab=diagram`, {
      replace: true,
      state: { banner: { title: 'Spatial diagram added to the Base Library', text: `Your diagram is on this space, marked “Yours”. You earned ${POINTS.diagram} points. The platform keeps the download fee for spatial diagrams. The space’s 3D model will be regenerated with it.`, links: [['/portfolio', 'Open your portfolio']] } },
    });
  };

  return (
    <Page narrow tag="clickable">
      <Crumbs items={[['/browse', 'Browse spaces'], [`/space/${space.id}`, space.name], [null, 'Upload spatial diagram']]} />
      <h1>Upload a spatial diagram</h1>
      <SpaceSummary space={space} />
      <Steps steps={['Drawings', 'Licence and terms']} current={step} />

      {step === 0 && (
        <div className="stack">
          <p className="prose">A measured plan and section with correct proportions, plus a simple 3D model if you have one. You earn {POINTS.diagram} points.</p>
          <FileDrop label={<>Diagram files<Req /></>} files={files} onChange={(v) => { setFiles(v); setErr({ ...err, files: undefined }); }} samples={['plan.dwg', 'section.dwg', 'model.obj']} error={err.files} />
          {drawings.length > 0 && (
            <ul className="halves preview-list" aria-label="Preview of your drawings">
              {drawings.map((f) => (
                <li key={f} className="stack-sm">
                  <ImageBox label={`${drawingLabel(f)}: ${f}`} />
                </li>
              ))}
            </ul>
          )}
          <Collaborators value={collaborators} onChange={setCollaborators} />
          <Input label="Notes on how it was measured" optional textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Choice type="checkbox" checked={measured} onChange={(e) => { setMeasured(e.target.checked); setErr({ ...err, measured: undefined }); }} title={<>This drawing is measured on site or from a scan<Req /></>} />
          {err.measured && <span className="error" role="alert">{err.measured}</span>}
          <FormActions>
            <Button to={`/space/${space.id}`}>Cancel</Button>
            <Button variant="primary" onClick={toTerms}>Continue</Button>
          </FormActions>
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          <h2 className="h-sm">How your diagram is sold</h2>
          <dl className="dl dl-wide">
            <dt>Download price</dt><dd>{cfg.priceLabel} or {cfg.modelPointsCost} points, the same for every diagram. The platform keeps the download fee; you earn {POINTS.diagram} points now.</dd>
            <dt>Copyright</dt><dd>You keep copyright. You give the platform a non-exclusive, permanent licence to sell downloads of this diagram, which continues if you leave.</dd>
            <dt>What buyers can do</dt><dd>Use it as the base for redesigns and their own projects. They can’t resell or redistribute the files, and you’re credited wherever it’s shown.</dd>
            <dt>Corrections</dt><dd>Others can flag errors. Moderators can ask you to fix or remove a diagram that doesn’t match the space.</dd>
            <dt>Liability</dt><dd>Diagrams are survey drawings for design, not certified measured surveys. Buyers check dimensions before building.</dd>
          </dl>
          <Choice type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErr({}); }} title={<>I made these drawings or have the right to share them, and I agree to the Base Library licence above<Req /></>} />
          {err.agree && <span className="error" role="alert">{err.agree}</span>}
          <FormActions>
            <Button onClick={() => setStep(0)}>Back</Button>
            <Button variant="primary" onClick={submit}>Add to Base Library</Button>
          </FormActions>
        </div>
      )}
    </Page>
  );
}

export const UploadRedesign = () => <Guard>{(space) => <RedesignForm space={space} />}</Guard>;

// Contest entry page: /contest/:id/enter
export function ContestEntry() {
  const { id } = useParams();
  const { state, get, isArchitect, user } = useDemo();
  const { contestEligibility } = useChoices();
  const contest = get.contest(id);
  const space = contest && get.space(contest.spaceId);
  if (!contest || !space) return <Page narrow><Empty title="Contest not found"><div><Button to="/contests">All contests</Button></div></Empty></Page>;
  const rule = ELIGIBILITY[contestEligibility] || ELIGIBILITY.both;
  if (!isArchitect || !rule.can(state.architectKind)) {
    return (
      <Page narrow tag="clickable">
        <RoleGate title={isArchitect ? 'You can’t enter this contest' : 'Architects only'}>{isArchitect ? `${rule.no} You’re signed in as ${state.architectKind === 'student' ? 'a student' : 'a licensed architect'}.` : `Who can enter: ${rule.text}`}</RoleGate>
        <div><Button to={`/contest/${contest.id}`}>Back to the contest</Button></div>
      </Page>
    );
  }
  const mine = contest.entries.find((e) => e.architectId === user?.id);
  if (contest.status === 'live' && contest.phase === 2) {
    if (mine && contest.shortlist.includes(mine.id)) return <ProposalEntry contest={contest} space={space} entry={mine} />;
    return <Page narrow><RoleGate title="Round 2 is for the shortlist">Only shortlisted architects submit full proposals.</RoleGate><div><Button to={`/contest/${contest.id}`}>Back to the contest</Button></div></Page>;
  }
  if (contest.status !== 'live') return <Page narrow><Empty title="Entries are closed"><div><Button to={`/contest/${contest.id}`}>Back to the contest</Button></div></Empty></Page>;
  if (mine) return <Page narrow><Empty title="You’ve already entered this contest"><p>Your concept is “{mine.title}”.</p><div><Button to={`/contest/${contest.id}`}>Back to the contest</Button></div></Empty></Page>;
  return <ConceptEntry contest={contest} space={space} />;
}

// Round 1: a light submission, one concept sheet and a short statement.
// Paid members enter free; everyone else pays the entry fee.
const CONCEPT_FILES = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_WORDS = 300;
function ConceptEntry({ contest, space }) {
  const { dispatch, user } = useDemo();
  const nav = useNavigate();
  const [f, setF] = useState({ title: '', statement: '', files: [], collaborators: [], agree: false, pay: 'card' });
  const [err, setErr] = useState('');
  const words = f.statement.trim() ? f.statement.trim().split(/\s+/).length : 0;
  const fee = !user.paid;
  const submit = () => {
    if (!f.title.trim()) return setErr('Give your concept a title.');
    if (!f.statement.trim()) return setErr('Add a short statement about the idea.');
    if (words > MAX_WORDS) return setErr(`Keep the statement to ${MAX_WORDS} words. It’s ${words} now.`);
    if (!f.files.length) return setErr('Add your concept sheet.');
    if (!f.agree) return setErr('Agree to the contest terms to enter.');
    setErr('');
    const entry = { id: `e-${Date.now()}`, submittedAt: new Date().toISOString().slice(0, 10), architectId: user.id, title: f.title.trim(), statement: f.statement.trim(), files: f.files, collaborators: f.collaborators };
    dispatch({ type: 'SUBMIT_ENTRY', contestId: contest.id, entry, fee });
    return nav(`/contest/${contest.id}`, { replace: true });
  };
  return (
    <Page narrow>
      <Crumbs items={[['/contests', 'Contests'], [`/contest/${contest.id}`, contest.title], [null, 'Submit a concept']]} />
      <div className="stack-sm">
        <h1>Submit a concept</h1>
        <p className="muted">Round 1 for {space.name}. Concepts are due {contest.deadline}. Keep it light: one sheet and a short statement. If you’re shortlisted you’re paid {contest.shortlistPay} to develop it into a full proposal.</p>
      </div>
      <div className="stack">
        <Input label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <Input label="Statement" textarea rows={5} value={f.statement} onChange={(e) => setF({ ...f, statement: e.target.value })} hint={`The idea in your own words. ${words} of ${MAX_WORDS} words.`} />
        <FileDrop label="Concept sheet (one page)" files={f.files} onChange={(files) => setF({ ...f, files: files.slice(-1) })} accept={CONCEPT_FILES} samples={['concept-sheet.pdf']} />
        <Collaborators value={f.collaborators} onChange={(collaborators) => setF({ ...f, collaborators })} />
        <section className="card stack-sm" aria-labelledby="fee-h">
          <h2 id="fee-h" className="h-sm">Entry fee</h2>
          {fee ? (
            <>
              <Choice name="fee" checked={f.pay === 'card'} onChange={() => setF({ ...f, pay: 'card' })} title={`Pay the ${contest.entryFee} entry fee`}>Charged to your card when you submit.</Choice>
              <p className="small">Or <Link to="/membership">join the paid tier</Link> and enter every contest free.</p>
            </>
          ) : <p className="small">Free: you’re a paid member.</p>}
        </section>
        <section className="card stack-sm" aria-labelledby="ct-h">
          <h2 id="ct-h" className="h-sm">Contest terms</h2>
          <dl className="dl dl-wide small">
            <dt>If you’re shortlisted</dt><dd>You’re paid {contest.shortlistPay} to develop your concept into a full proposal, due {contest.deadline2}.</dd>
            <dt>If you win</dt><dd>You receive the {contest.prize} prize and sell the design to {contest.coHost}.</dd>
            <dt>If you don’t win</dt><dd>You keep all rights to your work and can publish it in the Redesign Library.</dd>
          </dl>
          <label className="row small"><input type="checkbox" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} /> I have read and agree to these terms</label>
        </section>
        {err && <span className="error" role="alert">{err}</span>}
        <FormActions><Button to={`/contest/${contest.id}`}>Cancel</Button><Button variant="primary" onClick={submit}>{fee ? `Pay ${contest.entryFee} and submit` : 'Submit entry'}</Button></FormActions>
      </div>
    </Page>
  );
}

// Round 2: a shortlisted architect adds the full proposal to their concept.
function ProposalEntry({ contest, space, entry }) {
  const { dispatch } = useDemo();
  const nav = useNavigate();
  const [files, setFiles] = useState([]);
  const [text, setText] = useState(entry.statement || '');
  const [err, setErr] = useState('');
  const submit = () => {
    if (!files.length) return setErr('Add your drawings.');
    dispatch({ type: 'SUBMIT_PROPOSAL', contestId: contest.id, entryId: entry.id, proposal: { files, text: text.trim(), date: new Date().toISOString().slice(0, 10) } });
    return nav(`/contest/${contest.id}`, { replace: true });
  };
  return (
    <Page narrow>
      <Crumbs items={[['/contests', 'Contests'], [`/contest/${contest.id}`, contest.title], [null, 'Full proposal']]} />
      <div className="stack-sm">
        <h1>Submit your full proposal</h1>
        <p className="muted">“{entry.title}” is shortlisted for {space.name}. You’re paid {contest.shortlistPay} for this round. Proposals are due {contest.deadline2}.</p>
      </div>
      <div className="stack">
        <FileDrop label="Drawings" files={files} onChange={(v) => { setFiles(v); setErr(''); }} accept={[...REDESIGN_FILES, '.pdf']} samples={['plan.dwg', 'section.dwg', 'proposal-boards.pdf']} error={err} />
        <Input label="Description" textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} hint="How the proposal develops your concept." />
        <FormActions><Button to={`/contest/${contest.id}`}>Cancel</Button><Button variant="primary" onClick={submit}>Submit proposal</Button></FormActions>
      </div>
    </Page>
  );
}
export const UploadDiagram = () => <Guard>{(space) => <DiagramForm space={space} />}</Guard>;
