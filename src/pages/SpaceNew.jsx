import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Button, Choice, ImageBox, Input, Page, RoleGate, Select, Steps } from '../components/ui.jsx';
import { fmtPoints, uploadPoints } from '../lib/points.js';

const STEPS = ['Photos', 'Location', 'Same place?', 'Questionnaire', 'Optional details', 'Review'];
const NEAR = 's4'; // the existing entry used for the "within 50 m" simulation

export default function SpaceNew() {
  const { dispatch, user, get, cfg } = useDemo();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    photos: 0, geotag: 'yes', where: 'near', name: '', type: 'gateway threshold',
    feelings: '', transition: '', materiality: '', sensory: '',
    activity: '', materials: '', scans: 0, context: 0,
  });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  if (!user) return <Page narrow tag="simulated"><RoleGate title="Sign in to document a space">Any account holder can create a space.</RoleGate><div><Button to="/signup">Sign up</Button></div></Page>;

  const full = f.geotag === 'yes';
  const pts = uploadPoints({ photos: f.photos, scans: Number(f.scans), full });
  const near = get.space(NEAR);
  const go = (n, check) => () => {
    const msg = check?.();
    setErr(msg || '');
    if (!msg) setStep(n);
  };

  const merge = () => {
    dispatch({ type: 'MERGE_PHOTOS', spaceId: NEAR, photos: f.photos, userId: user.id, full });
    nav(`/space/${NEAR}`);
  };
  const submit = () => {
    const id = `s-${Date.now()}`;
    dispatch({
      type: 'CREATE_SPACE', id, userId: user.id, name: f.name.trim(), spaceType: f.type, photos: f.photos, scans: Number(f.scans), full,
      questionnaire: { feelings: f.feelings, transition: f.transition, materiality: f.materiality, sensory: f.sensory },
      properties: { activity: f.activity || 'Not given', materials: f.materials || 'Not given', climate: 'Not given', authorship: 'Not given' },
    });
    nav(`/space/${id}`);
  };

  return (
    <Page narrow tag="simulated">
      <h1>Create new interstitial space</h1>
      <Steps steps={STEPS} current={step} />
      {err && <span className="error" role="alert">{err}</span>}

      {step === 0 && (
        <div className="stack">
          <p className="note">Tip: include a person in the frame. It gives the AI a sense of scale for the spatial diagram.</p>
          <div className="grid">
            {Array.from({ length: f.photos }, (_, i) => <ImageBox key={i} label={`Your photo ${i + 1}`} />)}
          </div>
          <div className="row">
            <Button onClick={() => setF({ ...f, photos: f.photos + 1 })}>Add a photo</Button>
            {f.photos > 0 && <Button variant="quiet" onClick={() => setF({ ...f, photos: f.photos - 1 })}>Remove last</Button>}
            <span className="small muted">{f.photos} added. Simulated: placeholder photos.</span>
          </div>
          <div><Button variant="primary" onClick={go(1, () => (f.photos < 1 ? 'Add at least one photo.' : ''))}>Continue</Button></div>
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          <h2>Geotag check</h2>
          <Choice name="geo" checked={f.geotag === 'yes'} onChange={() => setF({ ...f, geotag: 'yes' })} title="Photos have a geotag and date (simulated: yes)">Location read from the photos: near Jaipur Darwaza.</Choice>
          <Choice name="geo" checked={f.geotag === 'no'} onChange={() => setF({ ...f, geotag: 'no' })} title="Photos have no geotag (simulated: missing)" />
          {f.geotag === 'no' && (
            <div className="alert" role="alert">
              <span className="bold">No geotag found: half points</span>
              <span>You can still submit. Photos and scans without a geotag, or taken off site, earn half points.</span>
            </div>
          )}
          <Select label="Where are the photos? (simulation control)" value={f.where} onChange={set('where')} options={[{ value: 'near', label: `Within ${cfg.duplicateRadiusM} m of an existing entry` }, { value: 'new', label: 'Nowhere near an existing entry' }]} />
          <div className="row"><Button variant="primary" onClick={() => setStep(f.where === 'near' ? 2 : 3)}>Continue</Button><Button onClick={() => setStep(0)}>Back</Button></div>
        </div>
      )}

      {step === 2 && (
        <div className="stack">
          <h2>Is this the same place?</h2>
          <p>There is already an entry within {cfg.duplicateRadiusM} m of your photos.</p>
          <div className="card">
            <ImageBox label="Existing entry" shape="wide" />
            <span className="bold">{near.name}</span>
            <span className="small muted">{near.photos.length} photos, {near.votes} votes</span>
          </div>
          <div className="stack-sm">
            <Button variant="primary" onClick={merge}>Yes, add my photos to this entry</Button>
            <span className="small muted">Skips the questionnaire. Your photos are credited to you.</span>
            <Button onClick={() => setStep(3)}>No, it’s a different place. Create a new entry</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="stack">
          <Input label="Name of the space" value={f.name} onChange={set('name')} placeholder="e.g. Steps beside the tea stall, Jaipur Darwaza" />
          <Select label="Type" value={f.type} onChange={set('type')} options={['stepwell', 'courtyard', 'chowk steps', 'gateway threshold', 'threshold']} />
          <Input label="How did it feel to be there?" textarea value={f.feelings} onChange={set('feelings')} />
          <Input label="What was the transition like, arriving and leaving?" textarea value={f.transition} onChange={set('transition')} />
          <Input label="Materiality: what is it made of?" value={f.materiality} onChange={set('materiality')} />
          <Input label="Sensory: sound, smell, light, temperature" value={f.sensory} onChange={set('sensory')} />
          <div className="row">
            <Button variant="primary" onClick={go(4, () => (!f.name.trim() || !f.feelings.trim() ? 'Give the space a name and say how it felt.' : ''))}>Continue</Button>
            <Button onClick={() => setStep(1)}>Back</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="stack">
          <h2>Optional details</h2>
          <Input label="Activity and observed users" value={f.activity} onChange={set('activity')} />
          <Input label="Materials, climate, who built or funded it" value={f.materials} onChange={set('materials')} />
          <Select label="3D scans" value={f.scans} onChange={set('scans')} options={[{ value: 0, label: 'None' }, { value: 1, label: '1 scan (+1 point)' }, { value: 2, label: '2 scans (+2 points)' }]} />
          <Select label="Photos of the surrounding context" value={f.context} onChange={set('context')} options={[{ value: 0, label: 'None' }, { value: 2, label: '2 context photos' }, { value: 4, label: '4 context photos' }]} />
          <div className="row"><Button variant="primary" onClick={() => setStep(5)}>Review</Button><Button onClick={() => setStep(3)}>Back</Button></div>
        </div>
      )}

      {step === 5 && (
        <div className="stack">
          <div className="card">
            <h2>{f.name}</h2>
            <dl className="dl">
              <dt>Type</dt><dd>{f.type}</dd>
              <dt>Photos</dt><dd>{f.photos}{Number(f.context) > 0 && ` + ${f.context} context`}</dd>
              <dt>Scans</dt><dd>{f.scans}</dd>
              <dt>Geotag</dt><dd>{full ? 'Found' : 'Missing (half points)'}</dd>
              <dt>Feelings</dt><dd>{f.feelings}</dd>
              <dt>Licence</dt><dd>Creative Commons. You keep ownership.</dd>
            </dl>
          </div>
          <p className="note">You’ll earn {fmtPoints(pts)} points, but only after moderators confirm the space qualifies. Until then it shows as “Pending” to everyone.</p>
          <div className="row"><Button variant="primary" onClick={submit}>Submit space</Button><Button onClick={() => setStep(4)}>Back</Button></div>
        </div>
      )}
    </Page>
  );
}
