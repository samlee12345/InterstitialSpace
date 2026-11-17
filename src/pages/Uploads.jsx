import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Button, Choice, Empty, FileDrop, ImageBox, Input, Page, RoleGate, Steps } from '../components/ui.jsx';
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

const R_STEPS = ['Files and description', 'Price', 'Terms'];

function RedesignForm({ space }) {
  const { dispatch, user, cfg, uploadLimit } = useDemo();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ title: '', description: '', files: [] });
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState({});
  const limit = uploadLimit(user.id);

  if (!limit.allowed) {
    return (
      <Page narrow tag="clickable">
        <Crumbs items={[['/browse', 'Browse spaces'], [`/space/${space.id}`, space.name], [null, 'Upload redesign']]} />
        <Empty title="One redesign a week">
          <p>Each architect can publish one redesign a week, so points reflect considered work. You can publish your next one on {limit.next.toLocaleDateString()}.</p>
          <p>You can still edit the redesigns you have published.</p>
          <div className="row"><Button to="/portfolio">Open your portfolio</Button><Button to={`/space/${space.id}`}>Back to the space</Button></div>
        </Empty>
      </Page>
    );
  }

  const next0 = () => {
    const e = {};
    if (!f.title.trim()) e.title = 'Give the redesign a title.';
    if (f.description.trim().length < 20) e.description = 'Describe the redesign in at least a sentence (20 characters).';
    if (f.files.length === 0) e.files = 'Add at least one file.';
    setErr(e);
    if (Object.keys(e).length === 0) setStep(1);
  };
  const publish = () => {
    if (!agree) return setErr({ agree: 'Accept the terms to publish.' });
    const title = f.title.trim();
    dispatch({ type: 'PUBLISH_REDESIGN', id: `r-${Date.now()}`, spaceId: space.id, userId: user.id, title, description: f.description.trim(), files: f.files });
    // Back to the space, with a confirmation banner. `replace` so Back does not reopen this form.
    return nav(`/space/${space.id}?tab=redesigns`, {
      replace: true,
      state: { banner: { title: 'Redesign published', text: `“${title}” is live on this space, marked “Yours”. You earned ${POINTS.redesign} points. It also appears in your portfolio and the architect ranking.`, links: [['/portfolio', 'Open your portfolio'], ['/ranking', 'See the ranking']] } },
    });
  };

  return (
    <Page narrow tag="clickable">
      <Crumbs items={[['/browse', 'Browse spaces'], [`/space/${space.id}`, space.name], [null, 'Upload redesign']]} />
      <h1>Upload a redesign</h1>
      <Steps steps={R_STEPS} current={step} />
      <SpaceSummary space={space} />

      {step === 0 && (
        <div className="stack">
          <Input label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} error={err.title} placeholder="e.g. Shaded seating along the lower steps" />
          <Input label="Description" textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} error={err.description} hint="What changes, and which resident requests it answers." />
          <FileDrop label="Design files (drawings, model)" files={f.files} onChange={(files) => setF({ ...f, files })} error={err.files} />
          <div className="row">
            <Button variant="primary" onClick={next0}>Continue to price</Button>
            <Button to={`/space/${space.id}`}>Cancel</Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          <div className="card">
            <span className="small muted">Price per download</span>
            <span className="display">{cfg.priceLabel}</span>
            <p>Every redesign has the same price, set by the platform. You don’t set it and can’t change it.</p>
            <dl className="dl">
              <dt>You receive</dt><dd>80% of each sale</dd>
              <dt>Platform keeps</dt><dd>20%</dd>
            </dl>
          </div>
          <div className="row">
            <Button variant="primary" onClick={() => setStep(2)}>Continue to terms</Button>
            <Button onClick={() => setStep(0)}>Back</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="stack">
          <div className="card">
            <h3>Review the terms</h3>
            <ul>
              <li><span className="bold">80% you, 20% platform</span> on every download.</li>
              <li><span className="bold">You keep copyright.</span></li>
              <li>Buyers can use and adapt your design. They cannot redistribute it.</li>
              <li>An agency can ask to buy full design rights. The price and terms are agreed between you and them, and you must be credited.</li>
              <li>You can edit or unpublish at any time. Buyers keep the copy they bought.</li>
              <li>You can publish one redesign a week.</li>
            </ul>
            <p className="small"><Link to="/terms">Read the full terms summary</Link></p>
          </div>
          <div className="card sunken">
            <span className="bold">{f.title}</span>
            <span className="small">{f.description}</span>
            <span className="small muted">{f.files.join(', ')}</span>
          </div>
          <Choice type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} title="I accept these terms and confirm this is my own work" />
          {err.agree && <span className="error" role="alert">{err.agree}</span>}
          <div className="row">
            <Button variant="primary" onClick={publish}>Publish</Button>
            <Button onClick={() => setStep(1)}>Back</Button>
          </div>
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
      <div className="row">
        <Button variant="primary" onClick={submit}>Add to Base Library</Button>
        <Button to={`/space/${space.id}`}>Cancel</Button>
      </div>
    </Page>
  );
}

export const UploadRedesign = () => <Guard>{(space) => <RedesignForm space={space} />}</Guard>;
export const UploadDiagram = () => <Guard>{(space) => <DiagramForm space={space} />}</Guard>;
