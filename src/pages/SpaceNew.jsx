import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Badge, Button, FormActions, Icon, ImageBox, Input, Modal, Page, RoleGate, Select, Steps } from '../components/ui.jsx';
import { typeLabel } from '../components/domain.jsx';
import { useChoices } from '../design/choices.js';
import { POINTS, fmtPoints, uploadPoints } from '../lib/points.js';

/* Create new interstitial space, in three versions (Demo bar: Create new space):
 *  A "inline":  Photos → Area → Questionnaire (opens with "Is it one of these
 *               nearby spaces?") → Review.
 *  B "overlay": an overlay asks for photos first; the page runs Area → Nearby
 *               spaces (only if any) → Questionnaire → Review, with the photos in
 *               a side panel.
 *  C "confirm": Photos → Area → Questionnaire → Review; leaving the Area step
 *               opens a confirmation overlay listing spaces in the drawn area.
 * The photo location is fixed; people draw the space's extent around it. Nearby
 * spaces are those inside the drawn area or within a few metres of its edge. */

const EDGE_M = 5; // spaces this close to the drawn edge count as candidates
const ZOOMS = [320, 160, 80, 40]; // metres across the map at each zoom level
const ASPECT = 9 / 16; // map height / width (matches .area-map)
const PHOTO_POINT = {
  nearby: { lat: 26.91958, lng: 75.8309, label: 'by the east side of Jaipur Darwaza' },
  alone: { lat: 26.9301, lng: 75.8243, label: 'near Tripolia Bazaar' },
};
const DEFAULT_SHAPE = { mode: 'rect', pts: [{ x: -12, y: 9 }, { x: 12, y: 9 }, { x: 12, y: -9 }, { x: -12, y: -9 }], r: 12 };
const TYPES = ['stepwell', 'courtyard', 'chowk steps', 'gateway threshold', 'threshold', 'other'];
// Optional questionnaire details; each one filled in earns POINTS.field.
const DETAIL_FIELDS = ['transition', 'materiality', 'sensory', 'activity', 'materials'];
const detailsDone = (f) => DETAIL_FIELDS.filter((k) => f[k].trim()).length;
const RELATIONS = [['same', 'Same space'], ['child', 'It is inside my new space'], ['parent', 'My new space is inside it'], ['none', 'Not related']];

// ── Geometry, in metres east (x) and north (y) of the photo point ──
const M_PER_LAT = 110540;
const mPerLng = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);
const toXY = (c, p) => ({ x: (p.lng - c.lng) * mPerLng(c.lat), y: (p.lat - c.lat) * M_PER_LAT });
function insidePoly(p, pts) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const [a, b] = [pts[i], pts[j]];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}
function segDist(p, a, b) {
  const [dx, dy] = [b.x - a.x, b.y - a.y];
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
// 'inside', 'edge' (within EDGE_M of the outline) or null
function placeIn(p, shape) {
  if (shape.mode === 'circle') {
    const d = Math.hypot(p.x, p.y);
    return d <= shape.r ? 'inside' : d <= shape.r + EDGE_M ? 'edge' : null;
  }
  if (insidePoly(p, shape.pts)) return 'inside';
  const d = Math.min(...shape.pts.map((a, i) => segDist(p, a, shape.pts[(i + 1) % shape.pts.length])));
  return d <= EDGE_M ? 'edge' : null;
}
export function areaM2(shape) {
  if (shape.mode === 'circle') return Math.PI * shape.r * shape.r;
  return Math.abs(shape.pts.reduce((sum, a, i) => { const b = shape.pts[(i + 1) % shape.pts.length]; return sum + a.x * b.y - b.x * a.y; }, 0)) / 2;
}

const Req = () => (<><span className="req" aria-hidden="true"> *</span><span className="visually-hidden"> (required)</span></>);

// ── Photos, with hover-to-delete and the location check ──
function PhotoPicker({ photos, setPhotos, geotag, point, error, compact }) {
  const add = () => setPhotos([...photos, `ph-${Date.now()}-${photos.length}`]);
  return (
    <div className="stack">
      {!compact && <p className="note small">Tip: include a person in the frame. It gives the AI a sense of scale for the spatial diagram.</p>}
      <div className={`photo-grid ${compact ? 'photo-grid-compact' : ''}`}>
        {photos.map((id, i) => (
          <div key={id} className="photo-tile">
            <ImageBox label={`Photo ${i + 1}`} />
            <button type="button" className="photo-del" onClick={() => setPhotos(photos.filter((p) => p !== id))} aria-label={`Delete photo ${i + 1}`}>Delete</button>
          </div>
        ))}
        <button type="button" className="photo-add" onClick={add}>
          <span className="bold"><Icon name="photo" /> Take a photo</span>
          {!compact && <span className="xs muted">Opens the camera (simulated)</span>}
        </button>
        <button type="button" className="photo-add" onClick={add}>
          <span className="bold">Add photos</span>
          {!compact && <span className="xs muted">From your library (simulated)</span>}
        </button>
      </div>
      {!compact && photos.length > 0 && (geotag ? (
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

// ── Area editor: fixed photo point, zoom, four corners or a circle ──
function AreaEditor({ center, shape, setShape, candidates }) {
  const { visibleSpaces } = useDemo();
  const [zoom, setZoom] = useState(2);
  const box = useRef(null);
  const drag = useRef(null);
  const spanX = ZOOMS[zoom];
  const spanY = spanX * ASPECT;
  const pct = (p) => ({ left: 50 + (p.x / spanX) * 100, top: 50 - (p.y / spanY) * 100 });
  const others = visibleSpaces.map((s) => ({ s, p: toXY(center, s) })).filter(({ p }) => Math.abs(p.x) < spanX / 2 && Math.abs(p.y) < spanY / 2);
  const ids = new Set(candidates.map((c) => c.s.id));

  const move = (e) => {
    if (!drag.current) return;
    const r = box.current.getBoundingClientRect();
    const x = (((e.clientX - r.left) / r.width) - 0.5) * spanX;
    const y = (0.5 - ((e.clientY - r.top) / r.height)) * spanY;
    if (drag.current === 'r') setShape({ ...shape, r: Math.max(2, Math.round(Math.hypot(x, y))) });
    else setShape({ ...shape, pts: shape.pts.map((p, i) => (i === drag.current - 1 ? { x: Math.round(x), y: Math.round(y) } : p)) });
  };
  const keys = (which) => (e) => {
    const step = e.shiftKey ? 5 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (!d) return;
    e.preventDefault();
    if (which === 'r') setShape({ ...shape, r: Math.max(2, shape.r + (d[0] || d[1])) });
    else setShape({ ...shape, pts: shape.pts.map((p, i) => (i === which - 1 ? { x: p.x + d[0], y: p.y + d[1] } : p)) });
  };
  const handle = (which, p, label) => {
    const at = pct(p);
    return (
      <button
        key={which}
        type="button"
        className="area-handle"
        style={{ left: `${at.left}%`, top: `${at.top}%` }}
        aria-label={`${label}: ${Math.round(Math.abs(p.x))} m ${p.x >= 0 ? 'east' : 'west'}, ${Math.round(Math.abs(p.y))} m ${p.y >= 0 ? 'north' : 'south'} of the photo point. Arrow keys move it.`}
        onPointerDown={(e) => { drag.current = which; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={move}
        onPointerUp={() => { drag.current = null; }}
        onKeyDown={keys(which)}
      />
    );
  };
  const outline = shape.mode === 'rect' ? shape.pts.map(pct).map((q) => `${q.left},${q.top}`).join(' ') : null;
  const rPct = { x: (shape.r / spanX) * 100, y: (shape.r / spanY) * 100 };

  return (
    <div className="stack">
      <p className="small">The dot is where your photos were taken. It stays fixed. Draw the space around it: drag the four corners, or switch to a circle and drag its edge. You can also select a handle and use the arrow keys.</p>
      <div className="row between row-end">
        <fieldset className="segmented">
          <legend>Shape</legend>
          <div className="segmented-track">
            {[['rect', 'Four corners'], ['circle', 'Circle']].map(([m, l]) => (
              <label key={m} className="segment">
                <input type="radio" name="shape" checked={shape.mode === m} onChange={() => setShape({ ...shape, mode: m })} />
                <span>{l}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="row">
          <span className="small muted">About {spanX} m across</span>
          <Button onClick={() => setZoom(Math.max(0, zoom - 1))} disabled={zoom === 0} aria-label="Zoom out">−</Button>
          <Button onClick={() => setZoom(Math.min(ZOOMS.length - 1, zoom + 1))} disabled={zoom === ZOOMS.length - 1} aria-label="Zoom in">+</Button>
        </div>
      </div>
      <div ref={box} className="map area-map" style={{ '--map-zoom': ZOOMS[2] / spanX }}>
        <span className="map-label">Map placeholder: Jaipur. Dashed pins are pending.</span>
        <svg className="area-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {shape.mode === 'rect'
            ? <polygon points={outline} vectorEffect="non-scaling-stroke" />
            : <ellipse cx="50" cy="50" rx={rPct.x} ry={rPct.y} vectorEffect="non-scaling-stroke" />}
        </svg>
        {others.map(({ s, p }) => {
          const at = pct(p);
          return <span key={s.id} className={`pin pin-static ${s.status === 'approved' ? 'pin-approved' : 'pin-pending'} ${ids.has(s.id) ? 'pin-active' : ''}`} style={{ left: `${at.left}%`, top: `${at.top}%` }} title={s.name} aria-hidden="true" />;
        })}
        <span className="pin-me" style={{ left: '50%', top: '50%' }} role="img" aria-label="Where your photos were taken (fixed)" />
        {shape.mode === 'rect' ? shape.pts.map((p, i) => handle(i + 1, p, `Corner ${i + 1}`)) : handle('r', { x: shape.r, y: 0 }, `Circle edge, radius ${shape.r} m`)}
      </div>
      <p className="small" aria-live="polite">
        About {Math.round(areaM2(shape))} m². {candidates.length
          ? `${candidates.length} documented ${candidates.length === 1 ? 'space is' : 'spaces are'} in or next to this area (highlighted).`
          : 'No documented spaces in or next to this area.'}
      </p>
    </div>
  );
}

// ── Candidate spaces and how the new one relates to each ──
function Relations({ candidates, relations, setRelations }) {
  const set = (id, r) => {
    const next = { ...relations, [id]: r };
    if (r === 'same' || r === 'parent') Object.keys(next).forEach((k) => { if (k !== id && next[k] === r) next[k] = 'none'; });
    setRelations(next);
  };
  return (
    <div className="stack">
      <p className="small">These documented spaces are in or next to the area you drew. Interstitial spaces can sit inside each other, so tell us how yours relates to each.</p>
      {candidates.map(({ s, where }) => (
        <fieldset key={s.id} className="relation">
          <legend className="visually-hidden">How does your space relate to {s.name}?</legend>
          <div className="relation-head">
            <div className="card-row-img"><ImageBox label="Photo" shape="square" /></div>
            <div className="stack-sm grow">
              <a href={`#/space/${s.id}`} target="_blank" rel="noopener noreferrer" className="bold">
                {s.name}<span className="visually-hidden"> (opens in a new tab)</span>
              </a>
              <span className="row small"><Badge>{typeLabel(s.type)}</Badge>{s.status === 'pending' && <Badge kind="dashed">Pending</Badge>}<span className="muted">{where === 'inside' ? 'Inside your area' : 'At the edge of your area'}</span></span>
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
  const done = detailsDone(f);
  return (
    <div className="stack">
      <div className="points-meter" role="status">
        <span className="small"><span className="bold">The more you fill in, the more you earn.</span> Each optional detail adds {fmtPoints(POINTS.field)} points.</span>
        <span className="small">{done} of {DETAIL_FIELDS.length} details: +{fmtPoints(done * POINTS.field)} points</span>
        <span className="meter" aria-hidden="true"><span style={{ width: `${(done / DETAIL_FIELDS.length) * 100}%` }} /></span>
      </div>
      <p className="xs muted">Fields marked * are required.</p>
      <Input label={<>Name of the space<Req /></>} value={f.name} onChange={set('name')} placeholder="e.g. Steps beside the tea stall, Jaipur Darwaza" />
      <Select label={<>Type<Req /></>} value={f.type} onChange={set('type')} options={TYPES.map((t) => ({ value: t, label: t === 'other' ? 'Other: name a new type' : typeLabel(t) }))} />
      {f.type === 'other' && <Input label={<>Name the new type<Req /></>} value={f.customType} onChange={set('customType')} placeholder="e.g. Rooftop edge, bus shelter, temple plinth" hint="Moderators may merge it with an existing type later." />}
      <Input label={<>How did it feel to be there?<Req /></>} textarea value={f.feelings} onChange={set('feelings')} />
      <Input label="What was it like arriving and leaving?" textarea value={f.transition} onChange={set('transition')} />
      <Input label="Materiality: what is it made of?" value={f.materiality} onChange={set('materiality')} />
      <Input label="Senses: sound, smell, light, temperature" value={f.sensory} onChange={set('sensory')} />
      <h3 className="h-xs">More details</h3>
      <Input label="Activity and who uses it" value={f.activity} onChange={set('activity')} />
      <Input label="Materials, climate, who built or funded it" value={f.materials} onChange={set('materials')} />
      <p className="note small">3D scans: in the mobile app you’ll be able to scan the space with your phone and add it here.</p>
    </div>
  );
}

export default function SpaceNew() {
  const { state, dispatch, user, visibleSpaces, get } = useDemo();
  const { createFlow } = useChoices();
  const nav = useNavigate();
  const searchName = new URLSearchParams(useLocation().search).get('name') || '';
  const flow = ['overlay', 'confirm'].includes(createFlow) ? createFlow : 'inline';
  const point = state.createNearby ? PHOTO_POINT.nearby : PHOTO_POINT.alone;
  const [photos, setPhotos] = useState([]);
  const [photosDone, setPhotosDone] = useState(false); // version B: overlay finished
  const [overlayOpen, setOverlayOpen] = useState(flow === 'overlay');
  const [confirmOpen, setConfirmOpen] = useState(false); // version C
  const [step, setStep] = useState(0);
  const [shape, setShape] = useState(DEFAULT_SHAPE);
  const [relations, setRelations] = useState({});
  const [f, setF] = useState({ name: searchName, type: 'gateway threshold', feelings: '', transition: '', materiality: '', sensory: '', activity: '', materials: '', scans: 0, context: 0, mergeText: '', customType: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // Switching version in the Demo bar starts over.
  useEffect(() => { setOverlayOpen(flow === 'overlay'); setPhotos([]); setPhotosDone(false); setConfirmOpen(false); setStep(0); setErr(''); }, [flow]);

  if (!user) return <Page><RoleGate title="Sign in to document a space">Any account holder can create a space.</RoleGate><div><Button to="/signup">Sign up</Button></div></Page>;

  const candidates = visibleSpaces
    .map((s) => ({ s, where: placeIn(toXY(point, s), shape) }))
    .filter((c) => c.where)
    .sort((a, b) => (a.where === b.where ? 0 : a.where === 'inside' ? -1 : 1));
  // Forget answers for spaces no longer in the area.
  const liveRelations = Object.fromEntries(Object.entries(relations).filter(([id]) => candidates.some((c) => c.s.id === id)));
  const mergeId = Object.keys(liveRelations).find((k) => liveRelations[k] === 'same');
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
  const checkQuestionnaire = () => {
    if (merge) return f.mergeText.trim() ? '' : 'Say something about the space. Every contribution needs a comment.';
    if (!f.name.trim() || !f.feelings.trim()) return 'Fill in the fields marked *: name, type and how it felt.';
    if (f.type === 'other' && !f.customType.trim()) return 'Name the new type, or pick one from the list.';
    return '';
  };

  const submit = () => {
    if (!photos.length) { setErr('Add at least one photo before you submit.'); return undefined; }
    if (merge) {
      dispatch({ type: 'MERGE_PHOTOS', spaceId: merge.id, photos: photos.length, userId: user.id, full: true, text: f.mergeText.trim() });
      return nav(`/space/${merge.id}`, { state: { banner: { title: 'Experience added', text: `You said this is the same space, so your comment and ${photos.length} photo${photos.length === 1 ? '' : 's'} were added here, marked “Yours”.` } } });
    }
    const id = `s-${Date.now()}`;
    dispatch({
      type: 'CREATE_SPACE', id, userId: user.id, name: f.name.trim(), spaceType: f.type === 'other' ? f.customType.trim().toLowerCase() : f.type, photos: photos.length, scans: 0, fields: detailsDone(f), full: true,
      lat: point.lat, lng: point.lng, area: shape, areaM: Math.round(Math.sqrt(areaM2(shape) / Math.PI)), relations: liveRelations,
      questionnaire: { feelings: f.feelings, transition: f.transition || 'Not given', materiality: f.materiality || 'Not given', sensory: f.sensory || 'Not given' },
      properties: { activity: f.activity || 'Not given', materials: f.materials || 'Not given', climate: 'Not given', authorship: 'Not given' },
    });
    return nav(`/space/${id}`, { state: { banner: { title: 'Space submitted', text: 'It shows as Pending until moderators confirm it qualifies. Your points arrive then.' } } });
  };

  const pts = uploadPoints({ photos: photos.length, fields: detailsDone(f), full: true });
  const area = <AreaEditor center={point} shape={shape} setShape={setShape} candidates={candidates} />;
  const relationsBlock = candidates.length > 0 && <Relations candidates={candidates} relations={liveRelations} setRelations={setRelations} />;
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
          <dt>Photos</dt><dd>{photos.length}</dd>
          {!merge && <><dt>Type</dt><dd>{f.type === 'other' ? typeLabel(f.customType || 'Other') : typeLabel(f.type)}</dd><dt>Details filled in</dt><dd>{detailsDone(f)} of {DETAIL_FIELDS.length}</dd><dt>How it felt</dt><dd>{f.feelings}</dd><dt>Area</dt><dd>{shape.mode === 'circle' ? 'Circle' : 'Four corners'}, about {Math.round(areaM2(shape))} m²</dd></>}
          {merge && <><dt>Your comment</dt><dd>{f.mergeText}</dd></>}
          <dt>Licence</dt><dd>Creative Commons. You keep ownership.</dd>
        </dl>
      </div>
      {!merge && <p className="note small">You’ll earn {fmtPoints(pts)} points once moderators confirm the space qualifies. Until then it shows as Pending to everyone.</p>}
    </div>
  );
  const finalButton = <Button variant="primary" onClick={submit}>{merge ? 'Add to this space' : 'Submit space'}</Button>;
  const photoStep = <PhotoPicker photos={photos} setPhotos={(p) => { setPhotos(p); setErr(''); }} geotag={state.createGeotag} point={point} error={err} />;

  let steps; let body; let actions;
  if (flow === 'overlay') {
    const hasNearby = candidates.length > 0;
    steps = hasNearby ? ['Area', 'Nearby spaces', 'Questionnaire', 'Review'] : ['Area', 'Questionnaire', 'Review'];
    const blocks = [area, ...(hasNearby ? [relationsBlock] : []), questionnaireBlock, review];
    const s = Math.min(step, steps.length - 1);
    body = blocks[s];
    const last = steps.length - 1;
    const qIndex = steps.indexOf('Questionnaire');
    actions = (
      <>
        {s === 0 ? <Button to="/browse">Cancel</Button> : <Button onClick={go(s - 1)}>Back</Button>}
        {s < last ? <Button variant="primary" onClick={go(s + 1, s === qIndex ? checkQuestionnaire : null)}>{s === last - 1 ? 'Review' : 'Continue'}</Button> : finalButton}
      </>
    );
  } else {
    steps = ['Photos', 'Area', 'Questionnaire', 'Review'];
    const qBlock = (
      <div className="stack-lg">
        {flow === 'inline' && relationsBlock && <section className="stack" aria-labelledby="nearby-q"><h2 id="nearby-q" className="h-sm">Is it one of these nearby spaces?</h2>{relationsBlock}</section>}
        <section className="stack" aria-labelledby="q-h"><h2 id="q-h" className="h-sm">{merge ? 'Your experience' : 'About the space'}</h2>{questionnaireBlock}</section>
      </div>
    );
    body = [photoStep, area, qBlock, review][step];
    // Version C: leaving the map asks about the spaces in the drawn area first.
    const fromArea = () => { if (flow === 'confirm' && candidates.length) setConfirmOpen(true); else go(2)(); };
    actions = [
      <><Button to="/browse">Cancel</Button><Button variant="primary" onClick={go(1, checkPhotos)}>Continue</Button></>,
      <><Button onClick={go(0)}>Back</Button><Button variant="primary" onClick={fromArea}>Continue</Button></>,
      <><Button onClick={go(1)}>Back</Button><Button variant="primary" onClick={go(3, checkQuestionnaire)}>Review</Button></>,
      <><Button onClick={go(2)}>Back</Button>{finalButton}</>,
    ][step];
  }

  const showPage = flow !== 'overlay' || photosDone;
  return (
    <Page>
      <h1>Create new interstitial space</h1>
      {showPage && (
        <div className={flow === 'overlay' ? 'split' : 'stack-lg'}>
          <div className="stack-lg">
            <Steps steps={steps} current={Math.min(step, steps.length - 1)} />
            {body}
            {err && (flow === 'overlay' || step > 0) && <span className="error" role="alert">{err}</span>}
            <FormActions>{actions}</FormActions>
          </div>
          {flow === 'overlay' && (
            <aside className="card stack">
              <h2 className="h-sm">Your photos ({photos.length})</h2>
              <PhotoPicker compact photos={photos} setPhotos={setPhotos} geotag point={point} />
            </aside>
          )}
        </div>
      )}
      {flow === 'overlay' && !photosDone && !overlayOpen && (
        <div className="stack">
          <p>Start with your photos: we use their location to place the space and find spaces next to it.</p>
          <div><Button variant="primary" onClick={() => setOverlayOpen(true)}>Upload photos</Button></div>
        </div>
      )}
      {flow === 'overlay' && overlayOpen && (
        <Modal title="Upload photos of the space" wide onClose={() => setOverlayOpen(false)}>
          <p className="small">Your photos need location data. We use it to place the space on the map before you fill anything in.</p>
          {photoStep}
          <FormActions>
            <Button onClick={() => setOverlayOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { const m = checkPhotos(); setErr(m); if (m) return; setOverlayOpen(false); setPhotosDone(true); setStep(0); }}>Continue</Button>
          </FormActions>
        </Modal>
      )}
      {confirmOpen && (
        <Modal title="Is it one of these nearby spaces?" wide onClose={() => setConfirmOpen(false)}>
          <Relations candidates={candidates} relations={liveRelations} setRelations={setRelations} />
          <FormActions>
            <Button onClick={() => setConfirmOpen(false)}>Back to the map</Button>
            <Button variant="primary" onClick={() => { setConfirmOpen(false); go(2)(); }}>Continue</Button>
          </FormActions>
        </Modal>
      )}
      <p className="small muted"><Link to="/terms">How documentation is licensed</Link></p>
    </Page>
  );
}
