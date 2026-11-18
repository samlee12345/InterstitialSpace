import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Badge, Banner, Button, Empty, FormActions, Icon, ImageBox, Input, Mine, Modal, Page, StatusBadges, Steps, TabPanel, Tabs } from '../components/ui.jsx';
import { ContestPlans, RedesignCard, SpaceCard, contestStatus, contestWinner, typeLabel } from '../components/domain.jsx';
import { Dropdown } from '../components/Shell.jsx';
import { useChoices } from '../design/choices.js';
import { POINTS } from '../lib/points.js';

// Names in a short sentence: "A, B and 3 others".
const nameList = (names, max = 2) => (names.length <= max + 1 ? names.join(', ').replace(/, ([^,]*)$/, ' and $1') : `${names.slice(0, max).join(', ')} and ${names.length - max} others`);

// Simulated browser location prompt, so the demo behaves the same on every machine.
function LocationPrompt({ action, onPick, onClose }) {
  return (
    <Modal title="Share your location?" onClose={onClose}>
      <p>We check whether you are at this space when you {action}. On site earns {POINTS.interactOnSite} points; off site, or without location, earns {POINTS.interactOffSite}.</p>
      <div className="stack-sm">
        <Button variant="primary" onClick={() => onPick(true)}>Allow — I am at this space</Button>
        <Button onClick={() => onPick(false)}>Allow — I am somewhere else</Button>
        <Button onClick={() => onPick(false)}>Don’t allow</Button>
      </div>
    </Modal>
  );
}

// In the tabs view the tab names the section and carries the count, so no heading here.
function SectionHead({ id, title, note, children }) {
  return (
    <div className="row between">
      <div className="stack-sm">
        <h2 id={id} className="visually-hidden">{title}</h2>
        {note && <p className="small muted">{note}</p>}
      </div>
      <div className="row">{children}</div>
    </div>
  );
}

// ── Spatial diagrams: a space can have several ──────────────
function Diagrams({ space }) {
  const { dispatch, cfg, get, isArchitect } = useDemo();
  const aiPending = space.diagrams.length === 0 && space.photos.length >= cfg.aiDiagramMinPhotos;

  // Simulated AI: a space with 10+ photos shows "Processing…" and then a placeholder diagram.
  useEffect(() => {
    if (!aiPending) return undefined;
    const t = setTimeout(() => dispatch({ type: 'AI_DIAGRAM', spaceId: space.id }), 4000);
    return () => clearTimeout(t);
  }, [aiPending, space.id, dispatch]);

  return (
    <section className="stack" data-screen-label="Spatial diagrams" aria-labelledby="diagram-heading">
      <SectionHead id="diagram-heading" title={`Spatial diagrams (${space.diagrams.length})`} note="Measured plans and sections of the space as it is today. Sold as downloads from the Base Library.">
        {isArchitect && !aiPending && <Button variant="primary" to={`/space/${space.id}/upload-diagram`}>Upload spatial diagram</Button>}
      </SectionHead>
      {aiPending && (
        <div className="card">
          <div className="row"><div className="spinner" aria-hidden="true" /><h3>Processing…</h3></div>
          <p>This space has {space.photos.length} photos, so the AI is drawing a spatial diagram from them. Simulated: a placeholder diagram appears in a few seconds.</p>
        </div>
      )}
      {!aiPending && space.diagrams.length === 0 && (
        <Empty title="No spatial diagram yet">
          <p>The AI attempts a diagram once a space has {cfg.aiDiagramMinPhotos} photos. This one has {space.photos.length}. Architects can upload measured diagrams at any time.</p>
        </Empty>
      )}
      {space.diagrams.map((d, i) => {
        const credit = d.source === 'ai'
          ? `Drawn by AI from ${space.photos.length} photos by ${nameList(d.credits.map((id) => get.user(id)?.name))}`
          : `Measured and drawn by ${get.user(d.by)?.name}`;
        return (
          <article key={d.id} className="stack-sm diagram-set" aria-label={`Spatial diagram ${i + 1}`}>
            <div className="row between">
              <h3 className="h-xs">{d.label || (d.source === 'ai' ? 'AI diagram from photos' : 'Measured plan and section')}</h3>
              <span className="row small muted">{d.date && `Added ${d.date}`}{d.source === 'architect' && <Mine userId={d.by} />}</span>
            </div>
            <div className="halves">
              <figure className="captioned">
                <ImageBox label="Plan (placeholder)" />
                <figcaption title={d.source === 'ai' ? d.credits.map((id) => get.user(id)?.name).join(', ') : undefined}>{credit}</figcaption>
              </figure>
              <figure className="captioned">
                <ImageBox label="Section (placeholder)" />
                <figcaption>{d.source === 'ai' ? 'Section through the main space' : 'Uploaded by an architect'}</figcaption>
              </figure>
            </div>
            <p className="small muted">Download {cfg.priceLabel} or {cfg.modelPointsCost} points.</p>
          </article>
        );
      })}
    </section>
  );
}

// ── 3D model: one per space, generated by AI from the photos and diagrams ──
function Model3D({ space }) {
  const { state, cfg, need } = useDemo();
  const model = state.models.find((m) => m.spaceId === space.id && !m.takenDown && !m.archived);
  return (
    <section className="stack" data-screen-label="3D model" aria-labelledby="model-heading">
      <SectionHead id="model-heading" title="3D model" note="One model per space. Our AI builds it from every photo and spatial diagram people upload, and updates it as more arrive." />
      {model ? (
        <div className="split">
          <figure className="captioned">
            <ImageBox label="3D model viewer (placeholder): orbit, zoom, section cut" className="model-view" />
            <figcaption>Generated from {space.photos.length} photos and {space.diagrams.length} spatial diagram{space.diagrams.length === 1 ? '' : 's'}. Updated as people add more.</figcaption>
          </figure>
          <aside className="card">
            <h3>Download the model</h3>
            <p className="small muted">Plan, section and the 3D model with correct proportions.</p>
            <p><span className="bold">{cfg.priceLabel}</span> or {cfg.modelPointsCost} points</p>
            <Button variant="primary" to={`/item/${model.id}`} onClick={(e) => !need('buy') && e.preventDefault()}>View 3D model</Button>
          </aside>
        </div>
      ) : (
        <Empty title="No 3D model yet">
          <p>The AI builds the model once the space has a spatial diagram or {cfg.aiDiagramMinPhotos} photos. It has {space.diagrams.length} diagram{space.diagrams.length === 1 ? '' : 's'} and {space.photos.length} photos.</p>
        </Empty>
      )}
    </section>
  );
}

// ── Archived: everything from before a confirmed update ─────
function Archived({ space }) {
  const { state, get } = useDemo();
  const rounds = space.archive || [];
  return (
    <section className="stack" data-screen-label="Archived" aria-labelledby="archived-heading">
      <SectionHead id="archived-heading" title={`Archived (${rounds.length})`} note="When a space changes on the ground and a moderator confirms the update, everything contributed before it moves here." />
      {rounds.length === 0 && <Empty title="Nothing archived"><p>This space hasn’t been reported as updated since it was documented.</p></Empty>}
      {rounds.map((r) => {
        const exps = state.comments.filter((c) => c.spaceId === space.id && c.archived === r.date);
        const reds = state.redesigns.filter((x) => x.spaceId === space.id && x.archived === r.date);
        return (
          <article key={r.date} className="card stack-sm">
            <h3 className="h-sm">Before the update on {r.date}</h3>
            <p className="small">{r.reason}</p>
            <p className="small muted">{[[r.votes, 'vote to redesign', 'votes to redesign'], [r.photos.length, 'photo', 'photos'], [exps.length, 'experience', 'experiences'], [r.diagrams.length, 'spatial diagram', 'spatial diagrams'], [reds.length, 'redesign', 'redesigns']].map(([n, one, many]) => `${n} ${n === 1 ? one : many}`).join(', ')}.</p>
            {exps.length > 0 && (
              <ul className="list small">
                {exps.map((c) => <li key={c.id}><span className="bold">{get.user(c.userId)?.name}:</span> {c.text}</li>)}
              </ul>
            )}
            {reds.length > 0 && <p className="small">Redesigns: {reds.map((x) => <Link key={x.id} to={`/item/${x.id}`} className="archived-link">{x.title}</Link>)}</p>}
          </article>
        );
      })}
    </section>
  );
}

// ── Redesigns ───────────────────────────────────────────────
function Redesigns({ space }) {
  const { state, isMember, isArchitect, dispatch, rankOf, user, uploadLimit, here } = useDemo();
  const list = state.redesigns
    .filter((r) => r.spaceId === space.id && r.published && !r.takenDown && !r.archived)
    .sort((a, b) => rankOf(a.architectId) - rankOf(b.architectId));
  const limit = isArchitect ? uploadLimit(user.id, space.id) : null;
  return (
    <section className="stack" data-screen-label="Redesigns" aria-labelledby="redesigns-heading">
      <SectionHead id="redesigns-heading" title={`Redesigns (${list.length})`} note="Proposals by architects, paid per download. Architects ranked higher appear first.">
        {isArchitect && limit.allowed && <Button variant="primary" to={`/space/${space.id}/upload-redesign`}>Upload redesign</Button>}
        {isArchitect && !limit.allowed && <span className="small muted">You published a redesign for this space this week. You can add another here on {limit.next.toLocaleDateString()}; other spaces are open now.</span>}
      </SectionHead>
      {list.length === 0 && (
        <Empty title="No redesigns yet">
          <p>{isArchitect ? 'Be the first architect to propose one.' : 'Architects have not proposed a redesign for this space yet.'}</p>
        </Empty>
      )}
      {list.length > 0 && isMember && <div className="grid">{list.map((r) => <RedesignCard key={r.id} redesign={r} />)}</div>}
      {list.length > 0 && !isMember && (
        <div className="teaser">
          <div className="grid">{list.map((r) => <RedesignCard key={r.id} redesign={r} blurred />)}</div>
          <div className="teaser-cta">
            <div>
              <h3>{list.length} redesign{list.length > 1 ? 's' : ''} for this space</h3>
              <p className="small">Redesigns are visible to members.</p>
              <Button variant="primary" onClick={() => dispatch({ type: 'OPEN_SIGNUP', reason: 'redesigns', returnTo: here })}>See redesigns</Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Add or update your experience: a four-step overlay ───────
// 1. Location (confirms they're there; on site earns full points)
// 2. Comment (required) and photos (optional)
// 3. Quick questions about what it's like
// 4. Should it be redesigned? 0–10, and why
export const EXPERIENCE_QUESTIONS = [
  { id: 'feel', type: 'multi', legend: 'How does it feel to be here?', hint: 'Pick any that fit.', options: ['Calm', 'Welcoming', 'Busy', 'Cramped', 'Exposed', 'Unsafe'] },
  { id: 'senses', type: 'multi', legend: 'Senses: what stands out?', hint: 'Pick any that fit.', options: ['Too hot', 'Good shade', 'Noisy', 'Quiet', 'Bad smell', 'Dark at night'] },
  { id: 'access', type: 'single', legend: 'Arriving and leaving: how easy is it to get in and out?', options: ['Easy', 'Some difficulty', 'Hard'] },
  { id: 'fix', type: 'single', legend: 'What needs fixing most?', required: true, options: ['Shade', 'Seating', 'Lighting', 'Water', 'Drainage', 'Steps and access', 'Cleanliness', 'Nothing needs fixing'] },
  { id: 'keep', type: 'text', legend: 'What should stay as it is?', hint: 'Optional.' },
];
export const REDESIGN_REASONS = ['Unused', 'Unsafe', 'Underutilized'];
export const NEEDS_REDESIGN = 6; // 6–10 on the scale counts as "yes, redesign it"

function ChipGroup({ q, value, onChange }) {
  const multi = q.type === 'multi';
  const selected = multi ? value || [] : value;
  const toggle = (opt) => onChange(multi ? (selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt]) : opt);
  return (
    <fieldset className="chips-field">
      <legend>{q.legend}{q.required && <span className="muted"> (required)</span>}</legend>
      {q.hint && <span className="xs muted">{q.hint}</span>}
      <div className="chips">
        {q.options.map((opt) => (
          <label key={opt} className="chip">
            <input type={multi ? 'checkbox' : 'radio'} name={q.id} checked={multi ? selected.includes(opt) : selected === opt} onChange={() => toggle(opt)} />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// 0–10 scale as a row of radio buttons with labelled ends.
function Scale({ value, onChange }) {
  return (
    <fieldset className="scale">
      <legend>Is this space working well, or should it be redesigned?<span className="muted"> (required)</span></legend>
      <div className="scale-track">
        {Array.from({ length: 11 }, (_, i) => (
          <label key={i} className="scale-step">
            <input type="radio" name="redesign-need" checked={value === i} onChange={() => onChange(i)} />
            <span>{i}</span>
          </label>
        ))}
      </div>
      <div className="row between xs muted" aria-hidden="true"><span>0: works well as it is</span><span>10: needs a redesign</span></div>
    </fieldset>
  );
}

function ExperienceWizard({ space, mine, onClose, onPosted }) {
  const { dispatch, user } = useDemo();
  const [step, setStep] = useState(0);
  const [onSite, setOnSite] = useState(null);
  const [text, setText] = useState(mine?.text || '');
  const [photos, setPhotos] = useState(0);
  const [answers, setAnswers] = useState(mine?.answers || {});
  const [err, setErr] = useState('');
  const pickLocation = (v) => { setOnSite(v); setStep(1); };
  const toStep = (n, check) => () => {
    const m = check ? check() : '';
    setErr(m);
    if (!m) setStep(n);
  };
  const needsYes = answers.need >= NEEDS_REDESIGN;
  const post = () => {
    if (answers.need === undefined) return setErr('Choose a number from 0 to 10.');
    if (needsYes && !(answers.why || []).length) return setErr('Say why it needs a redesign: pick at least one.');
    dispatch({ type: 'ADD_EXPERIENCE', spaceId: space.id, userId: user.id, text: text.trim(), photos, onSite, answers: needsYes ? answers : { ...answers, why: [] } });
    onPosted(photos, !!mine);
    return onClose();
  };
  return (
    <Modal title={mine ? 'Update your experience' : 'Add your experience'} onClose={onClose} wide>
      <Steps steps={['Location', 'Your experience', 'What it’s like', 'Redesign it?']} current={step} />
      {step === 0 && (
        <div className="stack">
          {mine && <p className="note small">You can have one experience per space. Changing it replaces what you posted before; new photos are added to yours.</p>}
          <p>Are you at {space.name} right now? Sharing your location confirms it. Experiences posted on site earn {POINTS.interactOnSite} points; off site, or without location, {POINTS.interactOffSite}.</p>
          <div className="stack-sm">
            <Button variant="primary" onClick={() => pickLocation(true)}><Icon name="locate" />Share location: I’m here</Button>
            <Button onClick={() => pickLocation(false)}>Share location: I’m somewhere else</Button>
            <Button variant="quiet" onClick={() => pickLocation(false)}>Continue without location</Button>
          </div>
          <p className="xs muted">Simulated. No real location is read.</p>
        </div>
      )}
      {step === 1 && (
        <div className="stack">
          <p className="note small">{onSite ? 'Location confirmed: you’re at this space. Full points.' : 'Not confirmed on site. You’ll earn half points.'}</p>
          <Input label="How do you use this space? What is it like?" textarea value={text} onChange={(e) => setText(e.target.value)} error={err} />
          <div className="field">
            <span className="label">Photos (optional)</span>
            <div className="thumbs">{Array.from({ length: photos }, (_, i) => <ImageBox key={i} label={`${i + 1}`} shape="square" />)}</div>
            <div className="row">
              <Button onClick={() => setPhotos(photos + 1)}><Icon name="photo" />Take a photo</Button>
              <Button onClick={() => setPhotos(photos + 1)}>Choose from library</Button>
              {photos > 0 && <Button variant="quiet" onClick={() => setPhotos(photos - 1)}>Remove last</Button>}
            </div>
            <span className="xs muted">Tip: include a person in the frame. It helps the AI judge scale for the spatial diagram.</span>
          </div>
          <FormActions><Button onClick={() => setStep(0)}>Back</Button><Button variant="primary" onClick={toStep(2, () => (text.trim() ? '' : 'Say something about the space first.'))}>Continue</Button></FormActions>
        </div>
      )}
      {step === 2 && (
        <div className="stack">
          <p className="small muted">Quick questions. Answers from everyone feed the summary on this space and show architects what to fix.</p>
          {EXPERIENCE_QUESTIONS.map((q) => (q.type === 'text' ? (
            <Input key={q.id} label={q.legend} hint={q.hint} value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
          ) : (
            <ChipGroup key={q.id} q={q} value={answers[q.id]} onChange={(v) => { setAnswers({ ...answers, [q.id]: v }); setErr(''); }} />
          )))}
          {err && <span className="error" role="alert">{err}</span>}
          <FormActions><Button onClick={() => setStep(1)}>Back</Button><Button variant="primary" onClick={toStep(3, () => (answers.fix ? '' : 'Choose what needs fixing most, or “Nothing needs fixing”.'))}>Continue</Button></FormActions>
        </div>
      )}
      {step === 3 && (
        <div className="stack">
          <Scale value={answers.need} onChange={(v) => { setAnswers({ ...answers, need: v }); setErr(''); }} />
          {needsYes && (
            <ChipGroup q={{ id: 'why', type: 'multi', legend: 'Why should it be redesigned?', hint: 'Pick all that apply.', required: true, options: REDESIGN_REASONS }} value={answers.why} onChange={(v) => { setAnswers({ ...answers, why: v }); setErr(''); }} />
          )}
          {err && <span className="error" role="alert">{err}</span>}
          <FormActions><Button onClick={() => setStep(2)}>Back</Button><Button variant="primary" onClick={post}>{mine ? 'Update experience' : 'Post experience'}</Button></FormActions>
        </div>
      )}
    </Modal>
  );
}

// ── Experiences: AI summary, then each member's comment with their photos ──
function Experience({ space, setBanner }) {
  const { state, user, get, need } = useDemo();
  const [adding, setAdding] = useState(false);
  // Most relevant first: verified contributors, then more points.
  const posts = state.comments
    .filter((c) => c.spaceId === space.id && !c.archived)
    .sort((a, b) => (get.user(b.userId).verified ? 1 : 0) - (get.user(a.userId).verified ? 1 : 0) || get.user(b.userId).points - get.user(a.userId).points);
  const mine = user && posts.find((c) => c.userId === user.id);
  const scored = posts.filter((c) => c.answers?.need !== undefined);
  const avg = scored.length ? (scored.reduce((n, c) => n + c.answers.need, 0) / scored.length).toFixed(1) : null;
  const q = space.questionnaire;

  return (
    <section className="stack" data-screen-label="Experiences" aria-labelledby="exp-heading">
      <SectionHead id="exp-heading" title={`Experiences (${posts.length})`} note="How people use and feel about this space, with their photos. One per person; you can update yours.">
        <Button variant="primary" onClick={() => need('comment') && setAdding(true)}>{mine ? 'Update your experience' : 'Add your experience'}</Button>
      </SectionHead>

      <div className="summary-box">
        <div className="row between">
          <h3>What people say it’s like</h3>
          <span className="xs muted">Summarised by AI from {posts.length} experiences and the questionnaire</span>
        </div>
        <dl className="summary-grid">
          <div><dt>How it feels</dt><dd>{q.feelings}</dd></div>
          <div><dt>Arriving and leaving</dt><dd>{q.transition}</dd></div>
          <div><dt>Materials</dt><dd>{q.materiality}</dd></div>
          <div><dt>Senses</dt><dd>{q.sensory}</dd></div>
          <div><dt>How it’s used</dt><dd>{space.properties.activity}</dd></div>
          <div><dt>Redesign need</dt><dd>{avg ? `${avg} out of 10, from ${scored.length} ${scored.length === 1 ? 'person' : 'people'}` : 'Not rated yet'}</dd></div>
        </dl>
      </div>

      <ul className="list">
        {posts.map((c) => (
          <li key={c.id} className="experience">
            <div className="stack-sm grow">
              <div className="row">
                <span className="bold small">{get.user(c.userId).name}</span>
                {get.user(c.userId).verified && <Badge>Verified</Badge>}
                <Mine userId={c.userId} />
                {!c.onSite && <span className="xs muted">off site</span>}
                {c.updatedAt && <span className="xs muted">updated {c.updatedAt}</span>}
              </div>
              <p>{c.text}</p>
              {c.answers && (
                <div className="row small">
                  {c.answers.need !== undefined && <Badge kind={c.answers.need >= NEEDS_REDESIGN ? 'solid' : ''}>Redesign need {c.answers.need}/10{c.answers.why?.length ? `: ${c.answers.why.join(', ').toLowerCase()}` : ''}</Badge>}
                  {c.answers.fix && <Badge>{c.answers.fix === 'Nothing needs fixing' ? 'Nothing needs fixing' : `Needs fixing: ${c.answers.fix}`}</Badge>}
                  {[...(c.answers.feel || []), ...(c.answers.senses || [])].length > 0 && (
                    <span className="muted">{[...(c.answers.feel || []), ...(c.answers.senses || [])].join(', ')}</span>
                  )}
                </div>
              )}
            </div>
            {c.photoIds?.length > 0 && (
              <div className="exp-photos" aria-label={`${c.photoIds.length} photos`}>
                {c.photoIds.slice(0, 3).map((id, i) => (
                  <div key={id} className="exp-photo">
                    <ImageBox label={i === 2 && c.photoIds.length > 3 ? `+${c.photoIds.length - 2}` : 'Photo'} shape="square" />
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
        {posts.length === 0 && <li className="muted">No experiences yet. Be the first to add one.</li>}
      </ul>
      {adding && (
        <ExperienceWizard
          space={space}
          mine={mine}
          onClose={() => setAdding(false)}
          onPosted={(n, updated) => setBanner({ title: updated ? 'Experience updated' : 'Experience posted', text: updated ? 'Your experience on this space now shows your changes.' : `Your experience${n ? ` and ${n} photo${n > 1 ? 's' : ''}` : ''} now show on this space, marked “Yours”.` })}
        />
      )}
    </section>
  );
}

// ── Contest: only rendered when this space has a contest. The whole card opens the contest. ──
function ContestCard({ contest }) {
  const { isArchitect, user, get } = useDemo();
  const entered = user && contest.entries.some((e) => e.architectId === user.id);
  const won = contestWinner(contest);
  if (won) {
    return (
      <section className="contest-card contest-closed" data-screen-label="Contest" aria-labelledby={`contest-${contest.id}`}>
        <div className="stack-sm grow">
          <div className="row"><Badge>Contest closed</Badge></div>
          <h2 id={`contest-${contest.id}`}><Link className="stretched" to={`/contest/${contest.id}`}>{contest.title}</Link></h2>
          <p className="small"><span className="bold">Winner:</span> {won.title} by {get.user(won.architectId)?.name}, {contest.prize} prize from {contest.coHost}.</p>
          <ContestPlans contest={contest} compact />
        </div>
      </section>
    );
  }
  return (
    <section className="contest-card" data-screen-label="Contest" aria-labelledby={`contest-${contest.id}`}>
      <div className="stack-sm grow">
        <div className="row"><Badge kind={contest.status === 'live' ? 'solid' : ''}>Contest: {contestStatus(contest).toLowerCase()}</Badge>{entered && <Badge>You entered</Badge>}</div>
        <h2 id={`contest-${contest.id}`}><Link className="stretched" to={`/contest/${contest.id}`}>{contest.title}</Link></h2>
        <p className="small">
          <span className="display-sm">{contest.prize}</span> prize, co-hosted by {contest.coHost}. {contest.status === 'live' ? `Entries close ${contest.deadline}.` : `Entries closed ${contest.deadline}.`}
        </p>
      </div>
      {isArchitect && contest.status === 'live' && !entered && (
        <Button variant="primary" className="above-stretch" to={`/contest/${contest.id}/enter`}>Submit an entry</Button>
      )}
    </section>
  );
}

// Interstitial spaces can sit inside other interstitial spaces.
function useRelated(space) {
  const { state, get } = useDemo();
  const parent = space.parentId ? get.space(space.parentId) : null;
  const children = state.spaces.filter((x) => x.parentId === space.id && !x.removed);
  return { parent: parent && !parent.removed ? parent : null, children };
}

function RelatedSpaces({ space }) {
  const { parent, children } = useRelated(space);
  return (
    <section className="stack" data-screen-label="Related spaces" aria-labelledby="related-heading">
      <SectionHead id="related-heading" title={`Related spaces (${(parent ? 1 : 0) + children.length})`} note="Interstitial spaces can sit inside other interstitial spaces: a bench ledge inside a gateway, a doorstep inside a courtyard." />
      {!parent && children.length === 0 && <Empty title="No related spaces"><p>This space isn’t part of another one, and no documented space sits inside it.</p></Empty>}
      {parent && (
        <div className="stack-sm">
          <h3 className="h-xs">Part of</h3>
          <div className="related-list"><SpaceCard space={parent} variant="row" headingLevel={4} /></div>
        </div>
      )}
      {children.length > 0 && (
        <div className="stack-sm">
          <h3 className="h-xs">Spaces within this one ({children.length})</h3>
          <div className="related-list">{children.map((c) => <SpaceCard key={c.id} space={c} variant="row" headingLevel={4} />)}</div>
        </div>
      )}
    </section>
  );
}

// ── Report an update: the space has changed on the ground ───
function ReportUpdate({ space, onClose }) {
  const { dispatch, user } = useDemo();
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState(0);
  const [err, setErr] = useState({});
  const send = () => {
    const e = {};
    if (text.trim().length < 15) e.text = 'Describe what changed, in a sentence or two.';
    if (!photos) e.photos = 'Add at least one photo of the space as it is now.';
    setErr(e);
    if (Object.keys(e).length) return;
    dispatch({ type: 'REPORT_UPDATE', spaceId: space.id, userId: user.id, text: text.trim(), photos });
    onClose();
  };
  return (
    <Modal title="Report an update" onClose={onClose} wide>
      <p className="small">Has {space.name} been rebuilt, repaired or changed? Show what it looks like now. If a moderator confirms it, everything contributed so far (votes, photos, experiences, diagrams and redesigns) moves to the Archived tab and the space starts fresh.</p>
      <Input label={<>What changed?<span className="req" aria-hidden="true"> *</span></>} textarea value={text} onChange={(e) => setText(e.target.value)} error={err.text} placeholder="e.g. The steps were rebuilt in stone and a handrail was added in October." />
      <div className="field">
        <span className="label">Proof: photos of the space now<span className="req" aria-hidden="true"> *</span></span>
        <div className="thumbs">{Array.from({ length: photos }, (_, i) => <ImageBox key={i} label={`${i + 1}`} shape="square" />)}</div>
        <div className="row">
          <Button onClick={() => setPhotos(photos + 1)}><Icon name="photo" />Take a photo</Button>
          <Button onClick={() => setPhotos(photos + 1)}>Choose from library</Button>
        </div>
        {err.photos && <span className="error" role="alert">{err.photos}</span>}
        <span className="xs muted">Photos need location data so moderators can check they were taken here.</span>
      </div>
      <FormActions><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={send}>Send to moderators</Button></FormActions>
    </Modal>
  );
}

// Votes to redesign, right-aligned in the header above the tabs.
function VoteBox({ space }) {
  const { dispatch, user, need } = useDemo();
  const [voting, setVoting] = useState(false);
  return (
    <div className="vote-box">
      <span className="vote-count"><span className="display-sm">{space.votes}</span> <span className="small">votes to redesign</span></span>
      <Button variant="primary" onClick={() => need('vote') && setVoting(true)}><Icon name="vote" />Vote to redesign</Button>
      {voting && (
        <LocationPrompt
          action="vote"
          onPick={(onSite) => { dispatch({ type: 'VOTE_SPACE', spaceId: space.id, userId: user.id, onSite }); setVoting(false); }}
          onClose={() => setVoting(false)}
        />
      )}
    </div>
  );
}

function OptionsMenu({ space, onReport }) {
  const { need } = useDemo();
  return (
    <Dropdown label="Options" className="options-menu">
      <button type="button" className="menu-item" onClick={() => need('report') && onReport()}>Report an update</button>
      <Link className="menu-item" to={`/removal/${space.id}`}>Remove space from the platform</Link>
    </Dropdown>
  );
}

// Header with three layouts (Demo bar, Space page): the photo is portrait.
function Header({ space, onReport }) {
  const { get } = useDemo();
  const { spaceHeader } = useChoices();
  const layout = ['strip', 'compact'].includes(spaceHeader) ? spaceHeader : 'portrait';
  const text = (
    <div className="space-head-text stack-sm">
      <div className="row"><Badge>{typeLabel(space.type)}</Badge><StatusBadges space={space} /><Mine userId={space.uploadedBy} /></div>
      <h1>{space.name}</h1>
      {space.parentId && get.space(space.parentId) && <p className="small">Part of <Link to={`/space/${space.parentId}`}>{get.space(space.parentId).name}</Link></p>}
      <p className="small muted">
        {space.city || 'Jaipur'}, {space.country || 'India'}. {space.lat.toFixed(4)}, {space.lng.toFixed(4)}. Documented by {get.user(space.uploadedBy)?.name}.
        {space.updatedAt && ` Updated ${space.updatedAt}.`}
      </p>
    </div>
  );
  const side = (
    <div className="space-head-side">
      <VoteBox space={space} />
      <OptionsMenu space={space} onReport={onReport} />
    </div>
  );
  return (
    <header className={`space-head space-head-${layout}`}>
      {layout === 'compact' && <div className="space-head-thumb"><ImageBox label="Photo" shape="portrait" /></div>}
      {text}
      {side}
      {layout === 'portrait' && <div className="space-head-photo"><ImageBox label="Photo of the space (portrait)" shape="portrait" /></div>}
      {layout === 'strip' && (
        <ul className="space-head-photos" aria-label="Photos of the space">
          {Array.from({ length: Math.min(6, Math.max(space.photos.length, 1)) }, (_, i) => <li key={i}><ImageBox label={space.photos.length ? `Photo ${i + 1}` : 'No photos yet'} shape="portrait" /></li>)}
        </ul>
      )}
    </header>
  );
}

const TABS = [
  { id: 'experience', label: 'Experiences' },
  { id: 'diagram', label: 'Spatial diagrams' },
  { id: 'model', label: '3D model' },
  { id: 'redesigns', label: 'Redesigns' },
  { id: 'related', label: 'Related spaces' },
  { id: 'contests', label: 'Contests' },
  { id: 'archived', label: 'Archived' },
];

export default function Space() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const loc = useLocation();
  const nav = useNavigate();
  const { state, get, user, isPaid } = useDemo();
  const [reporting, setReporting] = useState(false);
  const space = get.space(id);
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'experience';
  const banner = loc.state?.banner;
  const setBanner = (b) => nav(loc.pathname + loc.search, { replace: true, state: b ? { banner: b } : null });
  useEffect(() => { if (banner) window.scrollTo(0, 0); }, [banner]);

  if (!space) {
    return <Page narrow><Empty title="Space not found"><div><Button to="/browse">Browse spaces</Button></div></Empty></Page>;
  }
  if (space.removed) {
    const contributed = user && (space.uploadedBy === user.id || space.photos.some((p) => p.credit === user.id));
    return (
      <Page narrow>
        <Empty title="This space was removed">
          <p>The owner asked for it to be removed and the team agreed after reviewing proof of ownership.</p>
          {contributed && <p>You contributed to it. You were notified when it was removed.</p>}
          <div className="row"><Button to="/browse">Browse spaces</Button></div>
        </Empty>
      </Page>
    );
  }
  const contests = state.contests.filter((c) => c.spaceId === space.id);
  const related = { parent: space.parentId ? get.space(space.parentId) : null, children: state.spaces.filter((x) => x.parentId === space.id && !x.removed) };
  const pendingUpdate = state.updateReports.find((r) => r.spaceId === space.id && r.status === 'pending');
  // Contribution counts shown on the tabs.
  const counts = {
    experience: state.comments.filter((c) => c.spaceId === space.id && !c.archived).length,
    diagram: space.diagrams.length,
    model: state.models.some((m) => m.spaceId === space.id && !m.takenDown && !m.archived) ? 1 : 0,
    redesigns: state.redesigns.filter((r) => r.spaceId === space.id && r.published && !r.takenDown && !r.archived).length,
    related: (related.parent ? 1 : 0) + related.children.length,
    contests: contests.length,
    archived: (space.archive || []).length,
  };

  return (
    <Page>
      <nav className="small row" aria-label="Breadcrumb"><Link to="/browse">Browse spaces</Link><span className="muted">/</span><span className="muted">{space.name}</span></nav>
      <Banner banner={banner} onClose={() => setBanner(null)} />
      <Header space={space} onReport={() => setReporting(true)} />
      {space.status === 'pending' && (
        <p className="note">Pending approval: architects are checking that this is an interstitial space. Three yes votes approve it.</p>
      )}
      {pendingUpdate && (
        <p className="note">An update was reported on {pendingUpdate.date}: “{pendingUpdate.text}” A moderator is checking it. If it’s confirmed, contributions so far move to Archived.</p>
      )}
      {space.rejections?.length > 0 && (
        <div className="note stack-sm">
          <span className="bold">Reasons given by reviewers (public)</span>
          {space.rejections.map((r, i) => <span key={i}>{get.user(r.by)?.name}: {r.reason}</span>)}
        </div>
      )}

      <Tabs idBase="space" tabs={TABS.map((t) => ({ ...t, label: `${t.label} (${counts[t.id]})` }))} active={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} />
      <TabPanel idBase="space" id={tab}>
        {tab === 'experience' && <Experience space={space} setBanner={setBanner} />}
        {tab === 'diagram' && <Diagrams space={space} />}
        {tab === 'model' && <Model3D space={space} />}
        {tab === 'redesigns' && <Redesigns space={space} />}
        {tab === 'related' && <RelatedSpaces space={space} />}
        {tab === 'archived' && <Archived space={space} />}
        {tab === 'contests' && (contests.length > 0 ? (
          contests.map((c) => <ContestCard key={c.id} contest={c} />)
        ) : (
          <Empty title="No contest for this space">
            <p>Contests start from spaces the community has documented and voted on.</p>
            <div className="row"><Button to="/contests">Browse contests</Button>{isPaid && <Button to="/contest/request">Request to host a contest</Button>}</div>
          </Empty>
        ))}
      </TabPanel>
      {reporting && <ReportUpdate space={space} onClose={() => setReporting(false)} />}
    </Page>
  );
}
