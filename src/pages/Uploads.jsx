import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Button, Choice, Empty, FileDrop, FormActions, ImageBox, Input, Page, RoleGate, Select, Steps } from '../components/ui.jsx';
import { Crumbs } from '../components/domain.jsx';
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

export const SCOPES = ['Tactical / low-cost', 'Surface and seating', 'Canopy and shade', 'Lighting', 'Water and drainage', 'Full spatial reconfiguration'];
export const COSTS = ['Not sure', 'Under $1,000', '$1,000 to $5,000', '$5,000 to $25,000', 'Over $25,000'];

const Req = () => (<><span className="req" aria-hidden="true"> *</span><span className="visually-hidden"> (required)</span></>);

// One flow for both: a redesign for the Redesign Library, or an entry to a live contest (?contest=id).
function RedesignForm({ space }) {
  const { dispatch, user, cfg, uploadLimit, get } = useDemo();
  const nav = useNavigate();
  const contestId = new URLSearchParams(useLocation().search).get('contest');
  const contest = contestId ? get.contest(contestId) : null;
  const isEntry = !!contest && contest.status === 'live';
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ title: '', description: '', files: [], units: '', scaled: false, scope: [], cost: 'Not sure', agency: true, attest: false });
  const [err, setErr] = useState({});
  const limit = uploadLimit(user.id);
  const steps = isEntry ? ['Files and description', 'Details and rights', 'Prize and rights'] : ['Files and description', 'Details and licence', 'Price and payout'];
  const crumbs = [['/browse', 'Browse spaces'], [`/space/${space.id}`, space.name], [null, isEntry ? 'Submit a contest entry' : 'Upload redesign']];

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
        <Empty title="One redesign a week">
          <p>Each architect can publish one redesign a week, so points reflect considered work. You can publish your next one on {limit.next.toLocaleDateString()}.</p>
          <p>You can still edit the redesigns you have published.</p>
          <div className="row"><Button to="/portfolio">Open your portfolio</Button><Button to={`/space/${space.id}`}>Back to the space</Button></div>
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
    if (!f.scaled) e.scaled = 'Confirm the drawings match the Base Library dimensions.';
    if (!f.scope.length) e.scope = 'Choose at least one intervention scope.';
    if (!f.attest) e.attest = 'Confirm both statements to continue.';
    return e;
  };
  const next = (n, check) => () => {
    const e = check ? check() : {};
    setErr(e);
    if (!Object.keys(e).length) { setStep(n); window.scrollTo(0, 0); }
  };
  // Fixing a field clears its error.
  const upd = (patch) => { setF({ ...f, ...patch }); setErr(Object.fromEntries(Object.entries(err).filter(([k]) => !(k in patch)))); };
  const toggleScope = (v) => upd({ scope: f.scope.includes(v) ? f.scope.filter((x) => x !== v) : [...f.scope, v] });
  const details = { units: f.units, scope: f.scope, cost: f.cost, agency: isEntry ? false : f.agency };

  const finish = () => {
    const title = f.title.trim();
    if (isEntry) {
      const entry = { id: `e-${Date.now()}`, submittedAt: new Date().toISOString().slice(0, 10), architectId: user.id, title, statement: f.description.trim(), files: f.files, ...details };
      dispatch({ type: 'SUBMIT_ENTRY', contestId: contest.id, entry });
      return nav(`/space/${space.id}`, { replace: true, state: { banner: { title: 'Contest entry submitted', text: `“${title}” is entered in “${contest.title}”. The co-host judges after ${contest.deadline}; you’ll get a notification with the result.`, links: [[`/contest/${contest.id}`, 'Contest details'], ['/portfolio', 'Open your portfolio']] } } });
    }
    dispatch({ type: 'PUBLISH_REDESIGN', id: `r-${Date.now()}`, spaceId: space.id, userId: user.id, title, description: f.description.trim(), files: f.files, details });
    return nav(`/space/${space.id}?tab=redesigns`, {
      replace: true,
      state: { banner: { title: 'Redesign published', text: `“${title}” is live on this space, marked “Yours”. You earned ${POINTS.redesign} points. It also appears in your portfolio and the architect ranking.`, links: [['/portfolio', 'Open your portfolio'], ['/ranking', 'See the ranking']] } },
    });
  };

  return (
    <Page narrow>
      <Crumbs items={crumbs} />
      <h1>{isEntry ? `Enter “${contest.title}”` : 'Upload a redesign'}</h1>
      <p className="small muted">For {space.name}{isEntry ? `. Prize ${contest.prize}, entries close ${contest.deadline}.` : '.'}</p>
      <Steps steps={steps} current={step} />

      {step === 0 && (
        <div className="stack">
          <p className="xs muted">Fields marked * are required.</p>
          <Input label={<>Title<Req /></>} value={f.title} onChange={(e) => upd({ title: e.target.value })} error={err.title} placeholder="e.g. Shaded seating along the lower steps" />
          <Input label={<>Description<Req /></>} textarea value={f.description} onChange={(e) => upd({ description: e.target.value })} error={err.description} hint={isEntry ? 'How your design meets the co-host’s criteria.' : 'What changes, and which resident requests it answers.'} />
          <FileDrop label={<>Design files (drawings, model)<Req /></>} files={f.files} onChange={(files) => upd({ files })} error={err.files} />
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
          <Choice type="checkbox" checked={f.scaled} onChange={(e) => upd({ scaled: e.target.checked })} title={<>Drawings are scaled to match the space’s Base Library dimensions<Req /></>} />
          {err.scaled && <span className="error" role="alert">{err.scaled}</span>}
          <fieldset className="chips-field">
            <legend>Intervention scope<Req /></legend>
            <span className="xs muted">Pick all that apply.</span>
            <div className="chips">
              {SCOPES.map((v) => (
                <label key={v} className="chip"><input type="checkbox" checked={f.scope.includes(v)} onChange={() => toggleScope(v)} /><span>{v}</span></label>
              ))}
            </div>
            {err.scope && <span className="error" role="alert">{err.scope}</span>}
          </fieldset>
          <Select label="Estimated implementation cost" hint="A rough bracket so local authorities and civic partners can judge feasibility. Optional." value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} options={COSTS} />
          {!isEntry && (
            <Choice type="checkbox" checked={f.agency} onChange={(e) => setF({ ...f, agency: e.target.checked })} title="Let agencies and civic bodies contact me about buying expanded or exclusive implementation rights">
              Price and terms are agreed between you and them, and you must be credited. Optional.
            </Choice>
          )}
          <div className={`attest ${err.attest ? 'attest-error' : ''}`}>
            <Choice type="checkbox" checked={f.attest} onChange={(e) => upd({ attest: e.target.checked })} title={<>I confirm both of these<Req /></>}>
              <span className="attest-list">
                <span>This is my original work, does not infringe anyone else’s rights, and is submitted as a schematic design, not stamped construction documents.</span>
                {isEntry
                  ? <span>If my entry wins, I agree to sell the design rights to the contest co-host ({contest.coHost}) at the stated prize and sale price.</span>
                  : <span>I agree to the Platform Purchase Licence and the revenue split shown on the next page.</span>}
              </span>
            </Choice>
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
              <h2 id="prize-h" className="h-sm">Prize and rights</h2>
              <dl className="dl">
                <dt>Prize</dt><dd>{contest.prize}. The winner receives the full prize.</dd>
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
              <section className="card stack" aria-labelledby="licence-h">
                <h2 id="licence-h" className="h-sm">Copyright and buyer licence</h2>
                <dl className="dl dl-wide">
                  <dt>Copyright</dt><dd>You keep full copyright. If the platform ever shuts down, your work remains yours.</dd>
                  <dt>What buyers get</dt><dd>A non-exclusive Platform Purchase Licence to download, use and adapt the files. They can’t redistribute or resell them.</dd>
                  <dt>Credit</dt><dd>Any agency that buys further rights to build your design must credit you as the architect.{f.agency ? ' You’ve allowed agencies to contact you about this.' : ''}</dd>
                  <dt>Editing</dt><dd>Edit your files and description, or unpublish, anytime from your portfolio. Existing buyers keep their download links, which never expire.</dd>
                  <dt>Liability</dt><dd>Uploads are schematic proposals. Local code compliance and engineering sign-off are the implementing buyer’s responsibility.</dd>
                </dl>
                <Link className="small" to="/terms">Terms of Use</Link>
              </section>
            </>
          )}
          <div className="card sunken">
            <span className="bold">{f.title}</span>
            <span className="small">{f.description}</span>
            <span className="small muted">{[f.units, f.scope.join(', '), f.cost !== 'Not sure' && `Estimated cost ${f.cost}`].filter(Boolean).join('. ')}. Files: {f.files.join(', ')}</span>
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

function DiagramForm({ space }) {
  const { dispatch, user, cfg } = useDemo();
  const nav = useNavigate();
  const [files, setFiles] = useState([]);
  const [notes, setNotes] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState({});

  const submit = () => {
    const e = {};
    if (files.length === 0) e.files = 'Add a plan and a section.';
    if (!confirm) e.confirm = 'Confirm the drawing is measured.';
    setErr(e);
    if (Object.keys(e).length) return;
    dispatch({ type: 'UPLOAD_DIAGRAM', spaceId: space.id, userId: user.id, files, notes, modelId: `m-${Date.now()}` });
    const ready = space.status === 'pending' && space.photos.length >= cfg.manualDiagramMinPhotos;
    const extra = ready
      ? ` This space has ${space.photos.length} photos and a diagram, so it is now marked “Ready for approval”.`
      : space.status === 'pending' ? ` This space has ${space.photos.length} photos. It needs ${cfg.manualDiagramMinPhotos} before moderators can vote.` : '';
    nav(`/space/${space.id}?tab=diagram`, {
      replace: true,
      state: { banner: { title: 'Spatial diagram added to the Base Library', text: `Your diagram is on this space, marked “Yours”. You earned ${POINTS.diagram} points. The platform keeps the download fee for spatial diagrams.${extra}`, links: [['/portfolio', 'Open your portfolio']] } },
    });
  };

  if (space.diagram) {
    return (
      <Page narrow tag="clickable">
        <Empty title="This space already has a spatial diagram">
          <div><Button to={`/space/${space.id}`}>Back to the space</Button></div>
        </Empty>
      </Page>
    );
  }
  return (
    <Page narrow tag="clickable">
      <Crumbs items={[['/browse', 'Browse spaces'], [`/space/${space.id}`, space.name], [null, 'Upload spatial diagram']]} />
      <h1>Upload a spatial diagram</h1>
      <SpaceSummary space={space} />
      <p className="prose">A measured plan and section with correct proportions, plus a simple 3D model if you have one. You earn {POINTS.diagram} points. The platform keeps the download fee.</p>
      <div className="halves">
        <ImageBox label="Plan goes here" />
        <ImageBox label="Section goes here" />
      </div>
      <FileDrop label="Diagram files" files={files} onChange={setFiles} samples={['plan.dwg', 'section.dwg', 'model.obj']} error={err.files} />
      <Input label="Notes on how it was measured (optional)" textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Choice type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} title="This drawing is measured on site or from a scan" />
      {err.confirm && <span className="error" role="alert">{err.confirm}</span>}
      <FormActions>
        <Button to={`/space/${space.id}`}>Cancel</Button>
        <Button variant="primary" onClick={submit}>Add to Base Library</Button>
      </FormActions>
    </Page>
  );
}

export const UploadRedesign = () => <Guard>{(space) => <RedesignForm space={space} />}</Guard>;
export const UploadDiagram = () => <Guard>{(space) => <DiagramForm space={space} />}</Guard>;
