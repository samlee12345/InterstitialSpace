import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Badge, Banner, Button, Empty, ImageBox, Input, Mine, Modal, Page, PointsBadge, StatusBadges, Tabs } from '../components/ui.jsx';
import { Crumbs, RedesignCard, contestStatus } from '../components/domain.jsx';
import { POINTS } from '../lib/points.js';

const TABS = [
  { id: 'experience', label: 'Experience' },
  { id: 'diagram', label: 'Spatial diagram' },
  { id: 'redesigns', label: 'Redesigns' },
  { id: 'contests', label: 'Contests' },
];

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
      <p className="small muted">Simulated prompt. No real location is read.</p>
    </Modal>
  );
}

function SectionHead({ title, note, children }) {
  return (
    <div className="row between">
      <div className="stack-sm">
        <h2>{title}</h2>
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

  if (aiPending) {
    return (
      <section className="stack" data-screen-label="Spatial diagram">
        <SectionHead title="Spatial diagram" />
        <div className="card">
          <div className="row"><div className="spinner" aria-hidden="true" /><h3>Processing…</h3></div>
          <p>This space has {space.photos.length} photos, so the AI is drawing a spatial diagram from them. Simulated: a placeholder diagram appears in a few seconds.</p>
        </div>
      </section>
    );
  }
  if (!space.diagram) {
    return (
      <section className="stack" data-screen-label="Spatial diagram">
        <SectionHead title="Spatial diagram">
          {isArchitect && <Button variant="primary" to={`/space/${space.id}/upload-diagram`}>Upload spatial diagram</Button>}
        </SectionHead>
        <Empty title="No spatial diagram yet">
          <p>
            The AI attempts a diagram once a space has {cfg.aiDiagramMinPhotos} photos. This one has {space.photos.length}. An architect can upload one instead; with {cfg.manualDiagramMinPhotos} or more photos that makes the space ready for approval.
          </p>
        </Empty>
      </section>
    );
  }
  const d = space.diagram;
  return (
    <section className="stack" data-screen-label="Spatial diagram">
      <SectionHead title="Spatial diagram" note="A measured plan and section of the space as it is today." />
      <div className="split">
        <div className="stack">
          <div className="halves">
            <ImageBox label="Measured plan (placeholder)" />
            <ImageBox label="Section (placeholder)" />
          </div>
          {d.source === 'ai' ? (
            <p className="small">AI diagram drawn from community photos. Photographers credited: {d.credits.map((id) => get.user(id)?.name).join(', ')}.</p>
          ) : (
            <p className="small row">
              <span>Uploaded by <Link to={`/architect/${d.by}`}>{get.user(d.by)?.name}</Link>.</span>
              <Mine userId={d.by} />
            </p>
          )}
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
    <section className="stack" data-screen-label="Redesigns">
      <SectionHead title={`Redesigns (${list.length})`} note="Proposals by architects, paid per download. Architects ranked higher appear first.">
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

// ── Experiences ─────────────────────────────────────────────
function Experience({ space, setBanner }) {
  const { state, dispatch, user, get, need } = useDemo();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState(0);
  const [err, setErr] = useState('');
  const [ask, setAsk] = useState(null); // 'post' | 'vote'
  const [allPhotos, setAllPhotos] = useState(false);
  // "Most relevant" = contributors with more points first.
  const posts = state.comments
    .filter((c) => c.spaceId === space.id)
    .sort((a, b) => get.user(b.userId).points - get.user(a.userId).points);
  const shown = allPhotos ? space.photos : space.photos.slice(0, 8);

  const pick = (onSite) => {
    if (ask === 'vote') dispatch({ type: 'VOTE_SPACE', spaceId: space.id, userId: user.id, onSite });
    else {
      dispatch({ type: 'ADD_EXPERIENCE', spaceId: space.id, userId: user.id, text: text.trim(), photos, onSite });
      setBanner({ title: 'Experience posted', text: `Your experience${photos ? ` and ${photos} photo${photos > 1 ? 's' : ''}` : ''} now show on this space, marked “Yours”.` });
      setText(''); setPhotos(0); setOpen(false);
    }
    setAsk(null);
  };

  return (
    <section className="stack" data-screen-label="Experiences">
      <SectionHead title={`Experiences (${posts.length})`} note="How people use and feel about this space. Most relevant first: contributors with more points rank higher.">
        <Button onClick={() => need('vote') && setAsk('vote')}>Vote for this space ({space.votes})</Button>
        {!open && <Button variant="primary" onClick={() => need('comment') && setOpen(true)}>Add your experience</Button>}
      </SectionHead>

      {open && (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return setErr('Say something about the space first.');
            setErr('');
            return setAsk('post');
          }}
        >
          <h3>Your experience</h3>
          <Input label="How do you use this space? What should improve?" textarea value={text} onChange={(e) => setText(e.target.value)} error={err} />
          <div className="field">
            <span className="label">Photos (optional)</span>
            <div className="row">
              <Button onClick={() => setPhotos(photos + 1)}>Add a photo</Button>
              {photos > 0 && <Button variant="quiet" onClick={() => setPhotos(photos - 1)}>Remove last</Button>}
              <span className="small muted">{photos} added. Tip: include a person in the frame for scale.</span>
            </div>
          </div>
          <div className="row"><Button variant="primary" type="submit">Post experience</Button><Button onClick={() => setOpen(false)}>Cancel</Button></div>
        </form>
      )}

      <div className="split">
        <ul className="list">
          {posts.map((c) => (
            <li key={c.id} className="stack-sm">
              <div className="row">
                <span className="bold small">{get.user(c.userId).name}</span>
                <PointsBadge userId={c.userId} />
                <Mine userId={c.userId} />
                {!c.onSite && <span className="xs muted">off site</span>}
              </div>
              <p>{c.text}</p>
              {c.photos > 0 && <div className="thumbs">{Array.from({ length: c.photos }, (_, i) => <ImageBox key={i} label="Photo" shape="square" />)}</div>}
            </li>
          ))}
          {posts.length === 0 && <li className="muted">No experiences yet. Be the first to add one.</li>}
        </ul>
        <aside className="stack">
          <div className="card">
            <h3>How it feels</h3>
            <dl className="dl">
              <dt>Feelings</dt><dd>{space.questionnaire.feelings}</dd>
              <dt>Transition</dt><dd>{space.questionnaire.transition}</dd>
              <dt>Materiality</dt><dd>{space.questionnaire.materiality}</dd>
              <dt>Sensory</dt><dd>{space.questionnaire.sensory}</dd>
              <dt>Activity</dt><dd>{space.properties.activity}</dd>
              <dt>Climate</dt><dd>{space.properties.climate}</dd>
            </dl>
          </div>
        </aside>
      </div>

      <div className="stack-sm">
        <h3>Photos ({space.photos.length})</h3>
        <div className="thumbs">
          {shown.map((p, i) => (
            <figure key={p.id} className="stack-sm">
              <ImageBox label={`${i + 1}`} shape="square" />
              <figcaption className="xs muted">{p.credit === user?.id ? <span className="bold">Yours</span> : get.user(p.credit)?.name}</figcaption>
            </figure>
          ))}
        </div>
        {space.photos.length > 8 && <div><Button variant="quiet" onClick={() => setAllPhotos(!allPhotos)}>{allPhotos ? 'Show fewer photos' : `Show all ${space.photos.length} photos`}</Button></div>}
      </div>
      {ask && <LocationPrompt action={ask === 'vote' ? 'vote' : 'post'} onPick={pick} onClose={() => setAsk(null)} />}
    </section>
  );
}

// ── Contest banner: only rendered when this space has a contest ──
function ContestBanner({ contest }) {
  const { get, isArchitect, isMember, user } = useDemo();
  const mine = user && contest.entries.find((e) => e.architectId === user.id);
  return (
    <section className="alert" data-screen-label="Contest">
      <div className="row between row-top">
        <div className="stack-sm">
          <div className="row"><Badge kind={contest.status === 'live' ? 'solid' : ''}>Contest: {contestStatus(contest).toLowerCase()}</Badge></div>
          <h2>{contest.title}</h2>
          <p>
            <span className="display-sm">{contest.prize}</span> prize, co-hosted by {contest.coHost}. {contest.status === 'live' ? `Entries close ${contest.deadline}.` : `Entries closed ${contest.deadline}.`}
          </p>
        </div>
        <div className="row">
          <Button to={`/contest/${contest.id}`}>Contest details</Button>
          {isArchitect && contest.status === 'live' && !mine && <Button variant="primary" to={`/contest/${contest.id}?enter=1`}>Submit an entry</Button>}
        </div>
      </div>
      <h3>Redesigns submitted to this contest ({contest.entries.length})</h3>
      {isMember ? (
        <ul className="list small">
          {contest.entries.map((e) => (
            <li key={e.id} className="row">
              <span className="bold">{e.title}</span>
              <span className="muted">by <Link to={`/architect/${e.architectId}`}>{get.user(e.architectId)?.name}</Link></span>
              <Mine userId={e.architectId} />
              {contest.winner === e.id && <Badge kind="solid">Winner</Badge>}
            </li>
          ))}
          {contest.entries.length === 0 && <li className="muted">No entries yet.</li>}
        </ul>
      ) : (
        <p className="small muted">Sign up to see the entries.</p>
      )}
    </section>
  );
}

function LayoutSwitch() {
  const { layout, dispatch } = useDemo();
  return (
    <div className="row small" role="group" aria-label="Page layout">
      <span className="muted">View:</span>
      {[['single', 'One page'], ['tabs', 'Tabs']].map(([id, label]) => (
        <Button key={id} variant={layout === id ? 'primary' : 'default'} aria-pressed={layout === id} onClick={() => dispatch({ type: 'SET_LAYOUT', layout: id })}>{label}</Button>
      ))}
    </div>
  );
}

export default function Space() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const loc = useLocation();
  const nav = useNavigate();
  const { state, get, role, isArchitect, isPaid, user, layout } = useDemo();
  const space = get.space(id);
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'experience';
  const banner = loc.state?.banner;
  const setBanner = (b) => nav(loc.pathname + loc.search, { replace: true, state: b ? { banner: b } : null });
  useEffect(() => { if (banner) window.scrollTo(0, 0); }, [banner]);

  if (!space) {
    return (
      <Page narrow>
        <Empty title="Space not found"><div><Button to="/browse">Browse spaces</Button></div></Empty>
      </Page>
    );
  }
  if (space.removed) {
    const contributed = user && (space.uploadedBy === user.id || space.photos.some((p) => p.credit === user.id));
    return (
      <Page narrow tag="simulated">
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
    <Page tag={isArchitect ? 'clickable' : 'simulated'}>
      <div className="row between">
        <Crumbs items={[['/browse', 'Browse spaces'], [null, space.name]]} />
        <LayoutSwitch />
      </div>
      <Banner banner={banner} onClose={() => setBanner(null)} />
      <header className="stack">
        <div className="row"><Badge>{space.type}</Badge><StatusBadges space={space} /><Mine userId={space.uploadedBy} /></div>
        <h1>{space.name}</h1>
        <p className="small muted">
          {space.lat.toFixed(4)}, {space.lng.toFixed(4)}. Documented by {get.user(space.uploadedBy)?.name}. {space.votes} votes. Placeholder entry.
        </p>
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
      </header>

      {layout === 'single' ? (
        <>
          {contests.map((c) => <ContestBanner key={c.id} contest={c} />)}
          <Diagram space={space} />
          <hr className="rule" />
          <Redesigns space={space} />
          <hr className="rule" />
          <Experience space={space} setBanner={setBanner} />
        </>
      ) : (
        <>
          <Tabs tabs={TABS} active={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} />
          {tab === 'experience' && <Experience space={space} setBanner={setBanner} />}
          {tab === 'diagram' && <Diagram space={space} />}
          {tab === 'redesigns' && <Redesigns space={space} />}
          {tab === 'contests' && (contests.length > 0 ? (
            contests.map((c) => <ContestBanner key={c.id} contest={c} />)
          ) : (
            <Empty title="No contest for this space">
              <p>Contests start from spaces the community has documented and voted on.</p>
              <div className="row"><Button to="/contests">Browse contests</Button>{isPaid && <Button to="/contest/request">Request to host a contest</Button>}</div>
            </Empty>
          ))}
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
