import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Badge, Banner, Button, Empty, Icon, ImageBox, Input, Mine, Modal, Page, PointsBadge, StatusBadges, Steps, TabPanel, Tabs } from '../components/ui.jsx';
import { RedesignCard, contestStatus, typeLabel } from '../components/domain.jsx';
import { POINTS } from '../lib/points.js';

const TABS = [
  { id: 'experience', label: 'Experiences' },
  { id: 'diagram', label: 'Spatial diagram' },
  { id: 'redesigns', label: 'Redesigns' },
  { id: 'contests', label: 'Contests' },
];

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

function SectionHead({ id, title, note, children }) {
  return (
    <div className="row between">
      <div className="stack-sm">
        <h2 id={id}>{title}</h2>
        {note && <p className="small muted">{note}</p>}
      </div>
      <div className="row">{children}</div>
    </div>
  );
}

// ── Spatial diagram ─────────────────────────────────────────
function Diagram({ space }) {
  const { state, dispatch, cfg, get, isArchitect, need } = useDemo();
  const model = state.models.find((m) => m.spaceId === space.id && !m.takenDown);
  const aiPending = !space.diagram && space.photos.length >= cfg.aiDiagramMinPhotos;

  // Simulated AI: a space with 10+ photos shows "Processing…" and then a placeholder diagram.
  useEffect(() => {
    if (!aiPending) return undefined;
    const t = setTimeout(() => dispatch({ type: 'AI_DIAGRAM', spaceId: space.id }), 4000);
    return () => clearTimeout(t);
  }, [aiPending, space.id, dispatch]);

  let body;
  if (aiPending) {
    body = (
      <div className="card">
        <div className="row"><div className="spinner" aria-hidden="true" /><h3>Processing…</h3></div>
        <p>This space has {space.photos.length} photos, so the AI is drawing a spatial diagram from them. Simulated: a placeholder diagram appears in a few seconds.</p>
      </div>
    );
  } else if (!space.diagram) {
    body = (
      <Empty title="No spatial diagram yet">
        <p>The AI attempts a diagram once a space has {cfg.aiDiagramMinPhotos} photos. This one has {space.photos.length}. An architect can upload one instead; with {cfg.manualDiagramMinPhotos} or more photos that makes the space ready for approval.</p>
      </Empty>
    );
  } else {
    const d = space.diagram;
    const credit = d.source === 'ai'
      ? `Drawn by AI from ${space.photos.length} photos by ${nameList(d.credits.map((id) => get.user(id)?.name))}`
      : `Measured and drawn by ${get.user(d.by)?.name}`;
    body = (
      <div className="split">
        <div className="halves">
          <figure className="captioned">
            <ImageBox label="Measured plan (placeholder)" />
            <figcaption title={d.source === 'ai' ? d.credits.map((id) => get.user(id)?.name).join(', ') : undefined}>{credit}</figcaption>
          </figure>
          <figure className="captioned">
            <ImageBox label="Section (placeholder)" />
            <figcaption className="row">{d.source === 'architect' ? <><span>Uploaded by an architect</span><Mine userId={d.by} /></> : <span>Section through the main space</span>}</figcaption>
          </figure>
        </div>
        <aside className="card">
          <h3>Measured model</h3>
          {model ? (
            <>
              <p className="small muted">Plan, section and a simple 3D model with correct proportions.</p>
              <p><span className="bold">{cfg.priceLabel}</span> or {cfg.modelPointsCost} points</p>
              <Button variant="primary" to={`/item/${model.id}`} onClick={(e) => !need('buy') && e.preventDefault()}>View measured model</Button>
            </>
          ) : (
            <p className="small muted">The measured model for this diagram is being prepared.</p>
          )}
        </aside>
      </div>
    );
  }
  return (
    <section className="stack" data-screen-label="Spatial diagram" aria-labelledby="diagram-heading">
      <SectionHead id="diagram-heading" title="Spatial diagram" note={space.diagram ? 'A measured plan and section of the space as it is today.' : null}>
        {isArchitect && !space.diagram && !aiPending && <Button variant="primary" to={`/space/${space.id}/upload-diagram`}>Upload spatial diagram</Button>}
      </SectionHead>
      {body}
    </section>
  );
}

// ── Redesigns ───────────────────────────────────────────────
function Redesigns({ space }) {
  const { state, isMember, isArchitect, dispatch, rankOf, user, uploadLimit, here } = useDemo();
  const list = state.redesigns
    .filter((r) => r.spaceId === space.id && r.published && !r.takenDown)
    .sort((a, b) => rankOf(a.architectId) - rankOf(b.architectId));
  const limit = isArchitect ? uploadLimit(user.id) : null;
  return (
    <section className="stack" data-screen-label="Redesigns" aria-labelledby="redesigns-heading">
      <SectionHead id="redesigns-heading" title={`Redesigns (${list.length})`} note="Proposals by architects, paid per download. Architects ranked higher appear first.">
        {isArchitect && limit.allowed && <Button variant="primary" to={`/space/${space.id}/upload-redesign`}>Upload redesign</Button>}
        {isArchitect && !limit.allowed && <span className="small muted">You can publish one redesign a week. Next: {limit.next.toLocaleDateString()}.</span>}
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

// ── Add your experience: a three-step overlay ────────────────
// 1. Location (confirms they're there; on site earns full points)
// 2. Comment (required) and photos (optional)
// 3. Five quick questions about what needs fixing
export const EXPERIENCE_QUESTIONS = [
  { id: 'feel', type: 'multi', legend: 'How does it feel to be here?', hint: 'Pick any that fit.', options: ['Calm', 'Welcoming', 'Busy', 'Cramped', 'Exposed', 'Unsafe'] },
  { id: 'senses', type: 'multi', legend: 'Senses: what stands out?', hint: 'Pick any that fit.', options: ['Too hot', 'Good shade', 'Noisy', 'Quiet', 'Bad smell', 'Dark at night'] },
  { id: 'access', type: 'single', legend: 'Arriving and leaving: how easy is it to get in and out?', options: ['Easy', 'Some difficulty', 'Hard'] },
  { id: 'fix', type: 'single', legend: 'What needs fixing most?', required: true, options: ['Shade', 'Seating', 'Lighting', 'Water', 'Drainage', 'Steps and access', 'Cleanliness', 'Nothing needs fixing'] },
  { id: 'keep', type: 'text', legend: 'What should stay as it is?', hint: 'Optional.' },
];

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

function ExperienceWizard({ space, onClose, onPosted }) {
  const { dispatch, user } = useDemo();
  const [step, setStep] = useState(0);
  const [onSite, setOnSite] = useState(null);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState(0);
  const [answers, setAnswers] = useState({});
  const [err, setErr] = useState('');
  const pickLocation = (v) => { setOnSite(v); setStep(1); };
  const next = () => {
    if (!text.trim()) return setErr('Say something about the space first.');
    setErr('');
    return setStep(2);
  };
  const post = () => {
    if (!answers.fix) return setErr('Choose what needs fixing most, or “Nothing needs fixing”.');
    dispatch({ type: 'ADD_EXPERIENCE', spaceId: space.id, userId: user.id, text: text.trim(), photos, onSite, answers });
    onPosted(photos);
    return onClose();
  };
  return (
    <Modal title="Add your experience" onClose={onClose} wide>
      <Steps steps={['Location', 'Your experience', 'What needs fixing']} current={step} />
      {step === 0 && (
        <div className="stack">
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
              <Button onClick={() => setPhotos(photos + 1)}>Add a photo</Button>
              {photos > 0 && <Button variant="quiet" onClick={() => setPhotos(photos - 1)}>Remove last</Button>}
            </div>
            <span className="xs muted">Tip: include a person in the frame. It helps the AI judge scale for the spatial diagram.</span>
          </div>
          <div className="row"><Button variant="primary" onClick={next}>Continue</Button><Button variant="quiet" onClick={() => setStep(0)}>Back</Button></div>
        </div>
      )}
      {step === 2 && (
        <div className="stack">
          <p className="small muted">Five quick questions. Answers from everyone feed the summary at the top of this space and show architects what to fix.</p>
          {EXPERIENCE_QUESTIONS.map((q) => (q.type === 'text' ? (
            <Input key={q.id} label={q.legend} hint={q.hint} value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
          ) : (
            <ChipGroup key={q.id} q={q} value={answers[q.id]} onChange={(v) => { setAnswers({ ...answers, [q.id]: v }); setErr(''); }} />
          )))}
          {err && <span className="error" role="alert">{err}</span>}
          <div className="row"><Button variant="primary" onClick={post}>Post experience</Button><Button variant="quiet" onClick={() => setStep(1)}>Back</Button></div>
        </div>
      )}
    </Modal>
  );
}

// ── Experiences: AI summary, then each member's comment with their photos ──
function Experience({ space, setBanner }) {
  const { state, dispatch, user, get, need } = useDemo();
  const [adding, setAdding] = useState(false);
  const [voting, setVoting] = useState(false);
  // Most relevant first: contributors with more points rank higher.
  const posts = state.comments
    .filter((c) => c.spaceId === space.id)
    .sort((a, b) => get.user(b.userId).points - get.user(a.userId).points);
  const q = space.questionnaire;

  return (
    <section className="stack" data-screen-label="Experiences" aria-labelledby="exp-heading">
      <SectionHead id="exp-heading" title={`Experiences (${posts.length})`} note="How people use and feel about this space, with their photos. Most relevant first.">
        <Button onClick={() => need('vote') && setVoting(true)}>Vote for this space ({space.votes})</Button>
        <Button variant="primary" onClick={() => need('comment') && setAdding(true)}>Add your experience</Button>
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
          <div><dt>Climate</dt><dd>{space.properties.climate}</dd></div>
        </dl>
      </div>

      <ul className="list">
        {posts.map((c) => (
          <li key={c.id} className="experience">
            <div className="stack-sm grow">
              <div className="row">
                <span className="bold small">{get.user(c.userId).name}</span>
                <PointsBadge userId={c.userId} />
                <Mine userId={c.userId} />
                {!c.onSite && <span className="xs muted">off site</span>}
              </div>
              <p>{c.text}</p>
              {c.answers && (
                <div className="row small">
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
          onClose={() => setAdding(false)}
          onPosted={(n) => setBanner({ title: 'Experience posted', text: `Your experience${n ? ` and ${n} photo${n > 1 ? 's' : ''}` : ''} now show on this space, marked “Yours”.` })}
        />
      )}
      {voting && (
        <LocationPrompt
          action="vote"
          onPick={(onSite) => { dispatch({ type: 'VOTE_SPACE', spaceId: space.id, userId: user.id, onSite }); setVoting(false); }}
          onClose={() => setVoting(false)}
        />
      )}
    </section>
  );
}

// ── Contest: only rendered when this space has a contest. The whole card opens the contest. ──
function ContestCard({ contest }) {
  const { isArchitect, user } = useDemo();
  const entered = user && contest.entries.some((e) => e.architectId === user.id);
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
        <Button variant="primary" className="above-stretch" to={`/contest/${contest.id}?enter=1`}>Submit an entry</Button>
      )}
    </section>
  );
}

function Hero({ space }) {
  const { get } = useDemo();
  return (
    <header className="space-hero">
      <ImageBox label="Photo of the space (placeholder)" shape="hero" />
      <div className="space-hero-text">
        <div className="row"><Badge>{typeLabel(space.type)}</Badge><StatusBadges space={space} /><Mine userId={space.uploadedBy} /></div>
        <h1>{space.name}</h1>
        <p className="small">
          Jaipur, {space.lat.toFixed(4)}, {space.lng.toFixed(4)}. Documented by {get.user(space.uploadedBy)?.name}. {space.votes} votes.
        </p>
      </div>
    </header>
  );
}

export default function Space() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const loc = useLocation();
  const nav = useNavigate();
  const { state, get, role, user, layout, isPaid } = useDemo();
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
          {contributed && <p>You contributed to it. Your work is kept under Profile, Removed spaces.</p>}
          <div className="row"><Button to="/browse">Browse spaces</Button>{contributed && <Button to="/profile">Open profile</Button>}</div>
        </Empty>
      </Page>
    );
  }
  const contests = state.contests.filter((c) => c.spaceId === space.id);

  return (
    <Page>
      <nav className="small row" aria-label="Breadcrumb"><Link to="/browse">Browse spaces</Link><span className="muted">/</span><span className="muted">{space.name}</span></nav>
      <Banner banner={banner} onClose={() => setBanner(null)} />
      <Hero space={space} />
      {space.status === 'pending' && (
        <p className="note">
          Pending qualification: moderators have not yet confirmed this is an interstitial space.
          {space.readyForApproval ? ' It has a spatial diagram and is ready for their vote.' : ' It needs a spatial diagram before they can vote.'}
        </p>
      )}
      {space.rejections?.length > 0 && (
        <div className="note stack-sm">
          <span className="bold">Moderator reasons (public)</span>
          {space.rejections.map((r, i) => <span key={i}>{get.user(r.by)?.name}: {r.reason}</span>)}
        </div>
      )}

      {layout === 'single' ? (
        <>
          {contests.map((c) => <ContestCard key={c.id} contest={c} />)}
          <Diagram space={space} />
          <hr className="rule" />
          <Redesigns space={space} />
          <hr className="rule" />
          <Experience space={space} setBanner={setBanner} />
        </>
      ) : (
        <>
          <Tabs idBase="space" tabs={TABS} active={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} />
          <TabPanel idBase="space" id={tab}>
            {tab === 'experience' && <Experience space={space} setBanner={setBanner} />}
            {tab === 'diagram' && <Diagram space={space} />}
            {tab === 'redesigns' && <Redesigns space={space} />}
            {tab === 'contests' && (contests.length > 0 ? (
              contests.map((c) => <ContestCard key={c.id} contest={c} />)
            ) : (
              <Empty title="No contest for this space">
                <p>Contests start from spaces the community has documented and voted on.</p>
                <div className="row"><Button to="/contests">Browse contests</Button>{isPaid && <Button to="/contest/request">Request to host a contest</Button>}</div>
              </Empty>
            ))}
          </TabPanel>
        </>
      )}

      <hr className="rule" />
      <p className="small">
        {role === 'owner' ? <span className="bold">Is this your property? </span> : 'Own this property? '}
        <Link to={`/removal/${space.id}`}>Request removal</Link> (no account needed).
      </p>
    </Page>
  );
}
