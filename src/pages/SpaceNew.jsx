import { Fragment, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Badge, Button, FormActions, ImageBox, Input, Modal, Page, RoleGate, Select, Steps } from '../components/ui.jsx';
import { MapBox, distanceM, typeLabel } from '../components/domain.jsx';
import { useChoices } from '../design/choices.js';
import { fmtPoints, uploadPoints } from '../lib/points.js';

/* Create new interstitial space, in two versions (Demo bar: Create new space):
 *  A "inline":  Photos → Location and area → Questionnaire (opens with the nearby
 *               spaces question) → Review. Same step count whatever is nearby.
 *  B "overlay": an overlay asks for photos first; once their location is known the
 *               page runs Location and area → Nearby spaces (only if any) →
 *               Questionnaire → Review.
 * Photos must carry location data. The Demo bar decides whether they do, and
 * whether documented spaces lie within 50 m of them. */

const NEARBY_M = 50;
const PHOTO_POINT = {
  nearby: { lat: 26.91958, lng: 75.8309, label: 'by the east side of Jaipur Darwaza' },
  alone: { lat: 26.9301, lng: 75.8243, label: 'near Tripolia Bazaar' },
};
const TYPES = ['stepwell', 'courtyard', 'chowk steps', 'gateway threshold', 'threshold'];
const RELATIONS = [
  ['same', 'Same space', 'Add your photos and comment to it instead of creating a new entry.'],
  ['child', 'It is inside my new space', ''],
  ['parent', 'My new space is inside it', ''],
  ['none', 'Not related', ''],
];

const Req = () => (
  <>
    <span className="req" aria-hidden="true"> *</span>
    <span className="visually-hidden"> (required)</span>
  </>
);

// ── Photos, with hover-to-delete and the location check ──────
function PhotoPicker({ photos, setPhotos, geotag, point, error }) {
  const add = () => setPhotos([...photos, `ph-${Date.now()}-${photos.length}`]);
  return (
    <div className="stack">
      <p className="note small">Tip: include a person in the frame. It gives the AI a sense of scale for the spatial diagram.</p>
      <div className="photo-grid">
        {photos.map((id, i) => (
          <div key={id} className="photo-tile">
            <ImageBox label={`Photo ${i + 1}`} />
            <button type="button" className="photo-del" onClick={() => setPhotos(photos.filter((p) => p !== id))} aria-label={`Delete photo ${i + 1}`}>Delete</button>
          </div>
        ))}
        <button type="button" className="photo-add" onClick={add}>
          <span className="bold">Add photos</span>
          <span className="xs muted">Simulated upload</span>
        </button>
      </div>
      {photos.length > 0 && (geotag ? (
        <p className="small" role="status">Location found in your photos: taken {point.label} ({point.lat.toFixed(4)}, {point.lng.toFixed(4)}).</p>
      ) : (
        <div className="alert" role="alert">
          <span className="bold">These photos have no location data</span>
          <span className="small">We need it to place the space on the map. Turn on location for your camera and take the photos again, or choose photos that were taken with location on.</span>
        </div>
      ))}
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}

// ── Location and area: drag-free, click the map to move the centre ──
function AreaPicker({ center, setCenter, areaM, setAreaM, home }) {
  const { visibleSpaces } = useDemo();
  return (
    <div className="stack">
      <p className="small">This is where your photos were taken. Show the space’s extent: click the map to move its centre and use the slider for its size. Dashed pins are pending spaces.</p>
      <MapBox spaces={visibleSpaces} focus={center} me={center} meLabel="Centre of your space" areaM={areaM} onMapClick={setCenter} className="map-area-step" label="Map placeholder: click to move the centre" />
      <div className="row row-end">
        <div className="field grow">
          <label htmlFor="area-size">Size: about {areaM * 2} m across</label>
          <input id="area-size" type="range" min="3" max="40" value={areaM} onChange={(e) => setAreaM(Number(e.target.value))} />
        </div>
        <Button variant="quiet" onClick={() => setCenter(home)}>Back to the photo location</Button>
      </div>
    </div>
  );
}

// ── Nearby spaces and how the new one relates to each ──
function Relations({ nearby, relations, setRelations }) {
  const set = (id, r) => {
    const next = { ...relations, [id]: r };
    // One "same space" and one parent at most.
    if (r === 'same' || r === 'parent') Object.keys(next).forEach((k) => { if (k !== id && next[k] === r) next[k] = 'none'; });
    setRelations(next);
  };
  return (
    <div className="stack">
      <p className="small">{nearby.length} documented {nearby.length === 1 ? 'space is' : 'spaces are'} within {NEARBY_M} m of your photos. Interstitial spaces can sit inside each other, so tell us how yours relates to each.</p>
      {nearby.map(({ s, d }) => (
        <fieldset key={s.id} className="relation">
          <legend className="visually-hidden">How does your space relate to {s.name}?</legend>
          <div className="relation-head">
            <div className="card-row-img"><ImageBox label="Photo" shape="square" /></div>
            <div className="stack-sm grow">
              <a href={`#/space/${s.id}`} target="_blank" rel="noopener noreferrer" className="bold">
                {s.name}<span className="visually-hidden"> (opens in a new tab)</span>
              </a>
              <span className="row small"><Badge>{typeLabel(s.type)}</Badge>{s.status === 'pending' && <Badge kind="dashed">Pending</Badge>}<span className="muted">{Math.round(d)} m from your photos</span></span>
            </div>
          </div>
          <div className="chips">
            {RELATIONS.map(([val, label]) => (
              <label key={val} className="chip">
                <input type="radio" name={`rel-${s.id}`} checked={(relations[s.id] || 'none') === val} onChange={() => set(s.id, val)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

// ── Questionnaire with the optional details folded in ──
function Questionnaire({ f, set }) {
  return (
    <div className="stack">
      <p className="xs muted">Fields marked * are required.</p>
      <Input label={<>Name of the space<Req /></>} value={f.name} onChange={set('name')} placeholder="e.g. Steps beside the tea stall, Jaipur Darwaza" />
      <Select label={<>Type<Req /></>} value={f.type} onChange={set('type')} options={TYPES.map((t) => ({ value: t, label: typeLabel(t) }))} />
      <Input label={<>How did it feel to be there?<Req /></>} textarea value={f.feelings} onChange={set('feelings')} />
      <Input label="What was it like arriving and leaving?" textarea value={f.transition} onChange={set('transition')} />
      <Input label="Materiality: what is it made of?" value={f.materiality} onChange={set('materiality')} />
      <Input label="Senses: sound, smell, light, temperature" value={f.sensory} onChange={set('sensory')} />
      <h3 className="h-xs">More details</h3>
      <Input label="Activity and who uses it" value={f.activity} onChange={set('activity')} />
      <Input label="Materials, climate, who built or funded it" value={f.materials} onChange={set('materials')} />
      <div className="field-row">
        <Select label="3D scans" value={f.scans} onChange={set('scans')} options={[{ value: 0, label: 'None' }, { value: 1, label: '1 scan' }, { value: 2, label: '2 scans' }]} />
        <Select label="Photos of the surroundings" value={f.context} onChange={set('context')} options={[{ value: 0, label: 'None' }, { value: 2, label: '2 photos' }, { value: 4, label: '4 photos' }]} />
      </div>
    </div>
  );
}

function SoFar({ photos, center, areaM, relations, nearby, f, merge }) {
  const rel = nearby.filter(({ s }) => relations[s.id] && relations[s.id] !== 'none');
  const word = { same: 'Same space as', child: 'Contains', parent: 'Inside' };
  return (
    <aside className="card">
      <h2 className="h-sm">Your space so far</h2>
      <dl className="dl so-far">
        <dt>Photos</dt><dd>{photos.length || 'None yet'}</dd>
        <dt>Location</dt><dd>{center ? `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}` : 'From your photos'}</dd>
        <dt>Size</dt><dd>{center ? `about ${areaM * 2} m across` : 'Not set'}</dd>
        {rel.map(({ s }) => <Fragment key={s.id}><dt>{word[relations[s.id]]}</dt><dd>{s.name}</dd></Fragment>)}
        {!merge && f.name && <><dt>Name</dt><dd>{f.name}</dd></>}
      </dl>
      <p className="xs muted">Documentation is shared under Creative Commons. You keep ownership.</p>
    </aside>
  );
}

export default function SpaceNew() {
  const { state, dispatch, user, visibleSpaces, get } = useDemo();
  const { createFlow } = useChoices();
  const nav = useNavigate();
  const searchName = new URLSearchParams(useLocation().search).get('name') || '';
  const overlayFlow = createFlow === 'overlay';
  const point = state.createNearby ? PHOTO_POINT.nearby : PHOTO_POINT.alone;
  const [photos, setPhotos] = useState([]);
  const [photosDone, setPhotosDone] = useState(false); // version B: overlay finished
  const [overlayOpen, setOverlayOpen] = useState(overlayFlow);
  const [step, setStep] = useState(0);
  const [center, setCenter] = useState(null);
  const [areaM, setAreaM] = useState(10);
  const [relations, setRelations] = useState({});
  const [f, setF] = useState({ name: searchName, type: 'gateway threshold', feelings: '', transition: '', materiality: '', sensory: '', activity: '', materials: '', scans: 0, context: 0, mergeText: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // Switching version in the Demo bar starts over.
  useEffect(() => { setOverlayOpen(overlayFlow); setPhotosDone(false); setStep(0); setErr(''); }, [overlayFlow]);

  if (!user) return <Page tag="simulated"><RoleGate title="Sign in to document a space">Any account holder can create a space.</RoleGate><div><Button to="/signup">Sign up</Button></div></Page>;

  const nearby = visibleSpaces.map((s) => ({ s, d: distanceM(center || point, s) })).filter((x) => x.d <= NEARBY_M).sort((a, b) => a.d - b.d);
  const mergeId = Object.keys(relations).find((k) => relations[k] === 'same');
  const merge = mergeId ? get.space(mergeId) : null;

  const checkPhotos = () => {
    if (!photos.length) return 'Add at least one photo.';
    if (!state.createGeotag) return 'These photos have no location data. Add photos taken with location on to continue.';
    return '';
  };
  const go = (n, check) => () => {
    const msg = check ? check() : '';
    setErr(msg);
    if (!msg) { setStep(n); window.scrollTo(0, 0); }
  };
  const enterArea = () => { if (!center) setCenter(point); };

  const checkQuestionnaire = () => {
    if (merge) return f.mergeText.trim() ? '' : 'Say something about the space. Every contribution needs a comment.';
    if (!f.name.trim() || !f.feelings.trim()) return 'Fill in the fields marked *: name, type and how it felt.';
    return '';
  };

  const submit = () => {
    if (merge) {
      dispatch({ type: 'MERGE_PHOTOS', spaceId: merge.id, photos: photos.length, userId: user.id, full: true, text: f.mergeText.trim() });
      return nav(`/space/${merge.id}`, { state: { banner: { title: 'Experience added', text: `You said this is the same space, so your comment and ${photos.length} photo${photos.length === 1 ? '' : 's'} were added here, marked “Yours”.` } } });
    }
    const id = `s-${Date.now()}`;
    dispatch({
      type: 'CREATE_SPACE', id, userId: user.id, name: f.name.trim(), spaceType: f.type, photos: photos.length, scans: Number(f.scans), full: true,
      lat: center.lat, lng: center.lng, areaM, relations,
      questionnaire: { feelings: f.feelings, transition: f.transition || 'Not given', materiality: f.materiality || 'Not given', sensory: f.sensory || 'Not given' },
      properties: { activity: f.activity || 'Not given', materials: f.materials || 'Not given', climate: 'Not given', authorship: 'Not given' },
    });
    return nav(`/space/${id}`, { state: { banner: { title: 'Space submitted', text: 'It shows as Pending until moderators confirm it qualifies. Your points arrive then.' } } });
  };

  const pts = uploadPoints({ photos: photos.length, scans: Number(f.scans), full: true });

  // Steps for each version
  const relationsBlock = nearby.length > 0 && <Relations nearby={nearby} relations={relations} setRelations={setRelations} />;
  const questionnaireBlock = merge ? (
    <div className="stack">
      <p className="note small">You said this is the same space as <span className="bold">{merge.name}</span>. Your photos will be added to it as an experience, so the questionnaire is skipped.</p>
      <Input label={<>What is it like?<Req /></>} textarea value={f.mergeText} onChange={set('mergeText')} />
    </div>
  ) : <Questionnaire f={f} set={set} />;
  const review = (
    <div className="stack">
      <div className="card">
        <h2 className="h-sm">{merge ? `Adding to ${merge.name}` : f.name}</h2>
        <dl className="dl">
          <dt>Photos</dt><dd>{photos.length}{Number(f.context) > 0 && ` + ${f.context} of the surroundings`}</dd>
          {!merge && <><dt>Type</dt><dd>{typeLabel(f.type)}</dd><dt>How it felt</dt><dd>{f.feelings}</dd></>}
          {merge && <><dt>Your comment</dt><dd>{f.mergeText}</dd></>}
          <dt>Area</dt><dd>about {areaM * 2} m across at {center?.lat.toFixed(4)}, {center?.lng.toFixed(4)}</dd>
          <dt>Licence</dt><dd>Creative Commons. You keep ownership.</dd>
        </dl>
      </div>
      {!merge && <p className="note small">You’ll earn {fmtPoints(pts)} points once moderators confirm the space qualifies. Until then it shows as Pending to everyone.</p>}
    </div>
  );

  let steps; let body; let actions;
  if (!overlayFlow) {
    steps = ['Photos', 'Location and area', 'Questionnaire', 'Review'];
    body = [
      <PhotoPicker key="p" photos={photos} setPhotos={(p) => { setPhotos(p); setErr(''); }} geotag={state.createGeotag} point={point} error={err} />,
      <AreaPicker key="a" center={center || point} setCenter={setCenter} areaM={areaM} setAreaM={setAreaM} home={point} />,
      <div key="q" className="stack-lg">
        {relationsBlock && <section className="stack" aria-labelledby="nearby-q"><h2 id="nearby-q" className="h-sm">Is it one of these nearby spaces?</h2>{relationsBlock}</section>}
        <section className="stack" aria-labelledby="q-h"><h2 id="q-h" className="h-sm">{merge ? 'Your experience' : 'About the space'}</h2>{questionnaireBlock}</section>
      </div>,
      review,
    ][step];
    actions = [
      <Button key="n" variant="primary" onClick={go(1, () => { const m = checkPhotos(); if (!m) enterArea(); return m; })}>Continue</Button>,
      <><Button key="b" onClick={go(0)}>Back</Button><Button key="n" variant="primary" onClick={go(2)}>Continue</Button></>,
      <><Button key="b" onClick={go(1)}>Back</Button><Button key="n" variant="primary" onClick={go(3, checkQuestionnaire)}>Review</Button></>,
      <><Button key="b" onClick={go(2)}>Back</Button><Button key="n" variant="primary" onClick={submit}>{merge ? 'Add to this space' : 'Submit space'}</Button></>,
    ][step];
    if (step === 0) actions = <><Button to="/browse">Cancel</Button>{actions}</>;
  } else {
    const hasNearby = nearby.length > 0;
    steps = hasNearby ? ['Location and area', 'Nearby spaces', 'Questionnaire', 'Review'] : ['Location and area', 'Questionnaire', 'Review'];
    const blocks = [
      <AreaPicker key="a" center={center || point} setCenter={setCenter} areaM={areaM} setAreaM={setAreaM} home={point} />,
      ...(hasNearby ? [relationsBlock] : []),
      questionnaireBlock,
      review,
    ];
    body = photosDone ? blocks[step] : null;
    const last = steps.length - 1;
    const qIndex = steps.indexOf('Questionnaire');
    actions = photosDone && (
      <>
        {step === 0 ? <Button onClick={() => setOverlayOpen(true)}>Change photos</Button> : <Button onClick={go(step - 1)}>Back</Button>}
        {step < last
          ? <Button variant="primary" onClick={go(step + 1, step === qIndex ? checkQuestionnaire : null)}>{step === last - 1 ? 'Review' : 'Continue'}</Button>
          : <Button variant="primary" onClick={submit}>{merge ? 'Add to this space' : 'Submit space'}</Button>}
      </>
    );
  }

  return (
    <Page>
      <h1>Create new interstitial space</h1>
      {(!overlayFlow || photosDone) && (
        <div className="split">
          <div className="stack-lg">
            <Steps steps={steps} current={step} />
            {overlayFlow && step === 0 && <p className="small muted">{photos.length} photo{photos.length === 1 ? '' : 's'} uploaded.</p>}
            {body}
            {err && step > 0 && <span className="error" role="alert">{err}</span>}
            <FormActions>{actions}</FormActions>
          </div>
          <SoFar photos={photos} center={center} areaM={areaM} relations={relations} nearby={nearby} f={f} merge={merge} />
        </div>
      )}
      {overlayFlow && !photosDone && !overlayOpen && (
        <div className="stack">
          <p>Start with your photos: we use their location to find the space on the map and check for spaces nearby.</p>
          <div><Button variant="primary" onClick={() => setOverlayOpen(true)}>Upload photos</Button></div>
        </div>
      )}
      {overlayFlow && overlayOpen && (
        <Modal title="Upload photos of the space" wide onClose={() => setOverlayOpen(false)}>
          <p className="small">Your photos need location data. We use it to place the space and to check for documented spaces nearby before you fill anything in.</p>
          <PhotoPicker photos={photos} setPhotos={(p) => { setPhotos(p); setErr(''); }} geotag={state.createGeotag} point={point} error={err} />
          <FormActions>
            <Button onClick={() => { setOverlayOpen(false); if (!photosDone) nav(-1); }}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                const m = checkPhotos();
                setErr(m);
                if (m) return;
                enterArea();
                setOverlayOpen(false);
                setPhotosDone(true);
                setStep(0);
              }}
            >
              Continue
            </Button>
          </FormActions>
        </Modal>
      )}
      <p className="small muted"><Link to="/terms">How documentation is licensed</Link></p>
    </Page>
  );
}
