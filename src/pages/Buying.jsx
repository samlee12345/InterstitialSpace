import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDemo } from '../state/DemoContext.jsx';
import { Badge, Button, Choice, Empty, ImageBox, Input, Mine, Modal, Page, PointsBadge, RoleGate, Select, DemoOnly } from '../components/ui.jsx';
import { Crumbs } from '../components/domain.jsx';
import { fmtPoints } from '../lib/points.js';

// A listing is a redesign, the space's 3D model, or one of its spatial diagrams.
export const KIND_LABEL = { redesign: 'Redesign', model: '3D model', diagram: 'Spatial diagram' };
function useItem(id) {
  const { get } = useDemo();
  const dg = get.diagram(id);
  if (dg) {
    const { d, space } = dg;
    const item = {
      ...d,
      title: d.label || (d.source === 'ai' ? `AI spatial diagram of ${space.name}` : `Measured plan and section of ${space.name}`),
      version: 1,
      files: ['plan.pdf', 'section.pdf', 'plan-and-section.dwg'],
      description: d.source === 'ai'
        ? 'Plan and section drawn by AI from community photos. Proportions are approximate until an architect measures the space.'
        : 'Measured plan and section, drawn to scale by an architect on site.',
    };
    return { kind: 'diagram', item, space, seller: d.source === 'architect' ? get.user(d.by) : null };
  }
  const r = get.redesign(id);
  if (r) return { kind: 'redesign', item: r, space: get.space(r.spaceId), seller: get.user(r.architectId) };
  const m = get.model(id);
  if (m) return { kind: 'model', item: m, space: get.space(m.spaceId), seller: null };
  return null;
}

const LICENCE = { title: 'Use + adapt licence', text: 'Use the files and adapt them for your own project. You cannot redistribute them.' };
const FULL = { title: 'Full design rights (agencies)', text: 'The right to build this design and adapt it for construction, at a set price. The architect keeps copyright and must be credited.' };
const rightsTitle = (r) => (r === 'full' ? FULL.title : LICENCE.title);

function download(name) {
  const blob = new Blob([`Placeholder file for the class demo: ${name}\nNo real drawings are included in the prototype.\n`], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name.replace(/[^\w.-]+/g, '-').slice(0, 60)}-placeholder.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function Item() {
  const { id } = useParams();
  const found = useItem(id);
  const { state, dispatch, user, isMember, cfg, here, get } = useDemo();
  const [rights, setRights] = useState('licence');
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState('');
  const [connect, setConnect] = useState(false);

  if (!found) return <Page narrow><Empty title="Listing not found"><div><Button to="/browse">Browse spaces</Button></div></Empty></Page>;
  const { kind, item, space, seller } = found;
  const mine = seller && user?.id === seller.id;
  const owned = user && state.purchases.find((p) => p.userId === user.id && p.itemId === item.id);
  const hidden = item.takenDown || (kind === 'redesign' && !item.published);

  if (!isMember) {
    return (
      <Page narrow tag="clickable">
        <div className="teaser">
          <div className="card blur" aria-hidden="true"><ImageBox label="Preview" shape="wide" /><h2>Listing title</h2><p>Description of the listing.</p></div>
          <div className="teaser-cta"><div>
            <h3>Members only</h3>
            <p className="small">Sign up to see and buy redesigns and measured models.</p>
            <Button variant="primary" onClick={() => dispatch({ type: 'OPEN_SIGNUP', reason: 'buy', returnTo: here })}>Sign up</Button>
          </div></div>
        </div>
      </Page>
    );
  }

  return (
    <Page tag="clickable">
      <Crumbs items={[['/browse', 'Browse spaces'], [`/space/${space.id}`, space.name], [null, KIND_LABEL[kind]]]} />
      <div className="split">
        <div className="stack">
          <ImageBox label="Preview (watermarked placeholder)" shape="wide" />
          <div className="thumbs"><ImageBox label="Sheet 1" shape="square" /><ImageBox label="Sheet 2" shape="square" /><ImageBox label="Sheet 3" shape="square" /></div>
          <div className="row"><Badge>{KIND_LABEL[kind]}</Badge>{kind === 'redesign' && <Badge>Version {item.version}</Badge>}{seller && <Mine userId={seller.id} />}</div>
          <h1>{item.title}</h1>
          {seller && (
            <p className="row">
              <span>by <Link to={`/architect/${seller.id}`}>{seller.name}</Link>{item.collaborators?.length > 0 && <> with {item.collaborators.map((c) => (c.id ? get.user(c.id)?.name : c.email)).join(', ')}</>}</span>
              <PointsBadge userId={seller.id} />
            </p>
          )}
          <p className="prose">{item.description || 'Measured plan and section with correct proportions, plus a simple 3D model where available. Produced for the Base Library.'}</p>
          <p className="small muted">Files: {item.files.join(', ')}</p>
          <div className="card">
            <h2 className="h-sm">Licence</h2>
            <ul className="small">
              <li>You can use and adapt these files.</li>
              <li>You cannot redistribute them.</li>
              <li>{kind === 'redesign' ? 'The architect keeps copyright.' : kind === 'diagram' ? 'The platform keeps the fee for Base Library diagrams; the people who drew it and took the photos stay credited.' : 'The platform keeps the fee for Base Library models; community photographers stay credited.'}</li>
            </ul>
            <Link className="small" to="/terms">Terms of Use</Link>
          </div>
          {!mine && !hidden && <div><Button variant="quiet" onClick={() => setReport(!report)}>Report a problem with this listing</Button></div>}
          {report && (
            <form
              className="card"
              onSubmit={(e) => {
                e.preventDefault();
                if (!reason.trim()) return;
                dispatch({ type: 'FLAG_ITEM', itemId: item.id, reason: reason.trim() });
                setReport(false);
                setReason('');
              }}
            >
              <Input label="What is incorrect?" textarea value={reason} onChange={(e) => setReason(e.target.value)} required />
              <div><Button type="submit">Send report</Button></div>
            </form>
          )}
        </div>
        <aside className="card">
          {hidden ? (
            <>
              <h2 className="h-sm">No longer for sale</h2>
              <p className="small muted">{item.takenDown ? 'A moderator took this listing down.' : 'The architect unpublished this listing.'} People who bought it keep their copy.</p>
              {owned && <Button to="/purchases">Go to My purchases</Button>}
              {mine && <Button to="/portfolio">Manage in portfolio</Button>}
            </>
          ) : mine ? (
            <>
              <h2 className="h-sm">This is your listing</h2>
              <p className="small muted">{kind === 'redesign' ? `Buyers pay ${cfg.priceLabel}. You receive 80%.` : `Buyers pay ${cfg.priceLabel}. The platform keeps the fee; you stay credited on every download.`}</p>
              <Button variant="primary" to="/portfolio">Edit or unpublish in portfolio</Button>
            </>
          ) : owned ? (
            <>
              <h2 className="h-sm">You own this</h2>
              <p className="small muted">Bought {owned.date}. Download it again any time.</p>
              <Button variant="primary" to="/purchases">Go to My purchases</Button>
            </>
          ) : (
            <>
              <span className="small muted">Price</span>
              <span className="display">{rights === 'full' ? cfg.fullRightsLabel : cfg.priceLabel}</span>
              {(kind === 'model' || kind === 'diagram') && <p className="small">or {cfg.modelPointsCost} points for paid members. {user.paid ? `You have ${fmtPoints(user.points)}.` : 'Your ghost points can’t be spent.'}</p>}
              {kind === 'redesign' ? (
                <fieldset className="stack-sm plain">
                  <legend className="small bold">Choose rights</legend>
                  <Choice name="rights" value="licence" checked={rights === 'licence'} onChange={() => setRights('licence')} title={`${LICENCE.title} — ${cfg.priceLabel}`}>{LICENCE.text}</Choice>
                  <Choice name="rights" value="full" checked={rights === 'full'} onChange={() => setRights('full')} title={`${FULL.title} — ${cfg.fullRightsLabel}`}>{FULL.text}</Choice>
                </fieldset>
              ) : (
                <p className="small"><span className="bold">{LICENCE.title}.</span> {LICENCE.text}</p>
              )}
              {kind === 'redesign' && (
                <Choice type="checkbox" checked={connect} onChange={(e) => setConnect(e.target.checked)} title="Connect me with the architect to build the space">
                  After you buy, {seller.name} gets a message in the platform and by email with your contact details.
                </Choice>
              )}
              <Button variant="primary" to={`/checkout?item=${item.id}${rights === 'full' ? '&rights=full' : ''}${connect ? '&connect=1' : ''}`}>Continue to checkout</Button>
            </>
          )}
        </aside>
      </div>
    </Page>
  );
}

const fmtCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})(?=.)/g, '$1 ');
const fmtExp = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
};
const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Other'];

export function Checkout() {
  const [params] = useSearchParams();
  const found = useItem(params.get('item'));
  const { state, dispatch, user, cfg } = useDemo();
  const nav = useNavigate();
  const [method, setMethod] = useState('card');
  const [f, setF] = useState({ email: 'you@example.com', number: '', exp: '', cvc: '', name: '', country: 'India', zip: '' });
  const [phase, setPhase] = useState('form'); // form | paying | failed
  const [err, setErr] = useState({});
  const set = (k, fmt = (x) => x) => (e) => {
    setF({ ...f, [k]: fmt(e.target.value) });
    if (err[k]) setErr({ ...err, [k]: undefined });
  };

  if (!user) return <Page narrow tag="clickable"><RoleGate title="Sign in to check out">Visitors cannot buy.</RoleGate></Page>;
  if (!found) return <Page narrow><Empty title="Nothing to check out"><div><Button to="/browse">Browse spaces</Button></div></Empty></Page>;
  const { kind, item, space, seller } = found;
  const rights = kind === 'redesign' && params.get('rights') === 'full' ? 'full' : 'licence';
  const connect = kind === 'redesign' && params.get('connect') === '1';
  const price = rights === 'full' ? cfg.fullRightsLabel : cfg.priceLabel;
  const enough = user.paid && user.points >= cfg.modelPointsCost;
  const free = kind === 'model' && user.paid && user.freeModelsLeft > 0;
  const amount = method === 'points' ? `${cfg.modelPointsCost} points` : method === 'free' ? 'Free (paid tier)' : price;

  const validate = () => {
    const e = {};
    if (!f.email.includes('@')) e.email = 'Enter an email address for the receipt.';
    if (method === 'card') {
      if (f.number.replace(/\s/g, '').length < 15) e.number = 'Enter the full card number.';
      const [mm, yy] = f.exp.split('/').map((x) => x.trim());
      if (!/^\d{2}$/.test(mm || '') || !/^\d{2}$/.test(yy || '') || Number(mm) < 1 || Number(mm) > 12) e.exp = 'Use MM / YY.';
      if (!/^\d{3,4}$/.test(f.cvc)) e.cvc = '3 or 4 digits.';
      if (!f.name.trim()) e.name = 'Enter the name on the card.';
      if (!f.zip.trim()) e.zip = 'Enter a postal code.';
    }
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const pay = () => {
    if (!validate()) return;
    setPhase('paying');
    setTimeout(() => {
      if (state.failNextPayment) {
        dispatch({ type: 'SET_FAIL', on: false });
        return setPhase('failed');
      }
      const id = `p-${Date.now()}`;
      dispatch({
        type: 'PURCHASE',
        purchase: { id, userId: user.id, itemId: item.id, kind, title: item.title, rights, connect, method, amount, card: method === 'card' ? f.number.slice(-4) : null, version: item.version || 1, date: new Date().toISOString().slice(0, 10), receipt: `ISP-${String(Date.now()).slice(-6)}`, email: f.email },
      });
      return nav(`/purchase/${id}`, { replace: true });
    }, 900);
  };

  return (
    <Page tag="clickable">
      <div><Link className="back-link small" to={`/item/${item.id}`}>← Back to listing</Link></div>
      <h1>Checkout</h1>
      <div className="split">
        <div className="stack">
          {phase === 'failed' && (
            <div className="alert" role="alert">
              <h2>Payment failed — retry or change method</h2>
              <p>Your card was declined and you have not been charged. Try again, or pick another way to pay below.</p>
              <div className="row">
                <Button variant="primary" onClick={pay}>Retry payment</Button>
                <Button onClick={() => setPhase('form')}>Change method</Button>
              </div>
            </div>
          )}

          <section className="card">
            <h2>Contact</h2>
            <Input label="Email" type="email" value={f.email} onChange={set('email')} error={err.email} hint="Your receipt and download link are sent here." autoComplete="email" />
          </section>

          <section className="card">
            <h2>Payment</h2>
            <fieldset className="stack-sm plain" disabled={phase === 'paying'}>
              <legend className="small bold">How do you want to pay?</legend>
              <Choice name="method" value="card" checked={method === 'card'} onChange={() => setMethod('card')} title="Credit or debit card" />
              {(kind === 'model' || kind === 'diagram') && (
                <Choice name="method" value="points" checked={method === 'points'} onChange={() => setMethod('points')} disabled={!enough} title={`${cfg.modelPointsCost} points`}>
                  {!user.paid ? 'Only paid members collect points to spend. Your ghost points can’t be used.' : enough ? `You have ${fmtPoints(user.points)} points. ${fmtPoints(user.points - cfg.modelPointsCost)} left after this.` : `Not enough points: you have ${fmtPoints(user.points)}. Pay with money instead.`}
                </Choice>
              )}
              {free && (
                <Choice name="method" value="free" checked={method === 'free'} onChange={() => setMethod('free')} title="Free download (paid tier)">
                  {user.freeModelsLeft} of {cfg.paidFreeModels} free model downloads left this month. They don’t roll over.
                </Choice>
              )}
            </fieldset>
            {method === 'card' && (
              <div className="stack">
                <DemoOnly>
                  <p className="demo-note">No real payment is taken.</p>
                  <button
                    type="button"
                    className="demo-btn"
                    onClick={() => {
                      setF({ ...f, number: '4242 4242 4242 4242', exp: '12 / 29', cvc: '123', name: user.name.replace(' (you)', ''), zip: '302002' });
                      setErr({});
                    }}
                  >
                    Fill test card
                  </button>
                </DemoOnly>
                <Input label="Card number" value={f.number} onChange={set('number', fmtCard)} error={err.number} inputMode="numeric" placeholder="1234 1234 1234 1234" autoComplete="cc-number" />
                <div className="field-row">
                  <Input label="Expiry" value={f.exp} onChange={set('exp', fmtExp)} error={err.exp} inputMode="numeric" placeholder="MM / YY" autoComplete="cc-exp" />
                  <Input label="Security code" value={f.cvc} onChange={set('cvc', (v) => v.replace(/\D/g, '').slice(0, 4))} error={err.cvc} inputMode="numeric" placeholder="CVC" autoComplete="cc-csc" />
                </div>
                <Input label="Name on card" value={f.name} onChange={set('name')} error={err.name} autoComplete="cc-name" />
                <div className="field-row">
                  <Select label="Country" value={f.country} onChange={set('country')} options={COUNTRIES} />
                  <Input label="Postal code" value={f.zip} onChange={set('zip')} error={err.zip} autoComplete="postal-code" />
                </div>
              </div>
            )}
          </section>

          <div className="stack-sm">
            <Button variant="primary" onClick={pay} disabled={phase === 'paying'}>
              {phase === 'paying' ? 'Processing…' : method === 'card' ? `Pay ${price}` : method === 'points' ? `Pay ${cfg.modelPointsCost} points` : 'Download for free'}
            </Button>
            <p className="xs muted">{rights === 'full' ? 'By paying you buy the right to build this design; the architect keeps copyright and must be credited.' : 'By paying you accept the purchase licence: use and adapt, no redistribution.'} <Link to="/terms">Terms of Use</Link></p>
            {connect && <p className="small">After payment, {seller.name} is asked to get in touch about building it.</p>}
          </div>
        </div>

        <aside className="card summary">
          <h2>Order summary</h2>
          <div className="row row-top">
            <div className="summary-thumb"><ImageBox label="Preview" shape="square" /></div>
            <div className="stack-sm grow">
              <span className="bold">{item.title}</span>
              <span className="small muted">{kind === 'redesign' ? `Redesign by ${seller.name}` : `${KIND_LABEL[kind]}, Base Library`}</span>
              <span className="small muted">{rightsTitle(rights)}</span>
            </div>
          </div>
          <hr className="rule" />
          <dl className="dl dl-sum">
            <dt>Subtotal</dt><dd>{method === 'card' ? price : amount}</dd>
            <dt>Tax</dt><dd>{method === 'card' ? 'Included' : 'None'}</dd>
            <dt className="bold">Total</dt><dd className="bold">{amount}</dd>
          </dl>
          <hr className="rule" />
          <p className="xs muted">{kind === 'redesign' ? '80% of this goes to the architect and 20% to the platform.' : 'The platform keeps the fee for measured models. Any year-end surplus goes back to members.'}</p>
          <p className="xs muted">The download link never expires.</p>
        </aside>
      </div>
    </Page>
  );
}

function Receipt({ p }) {
  return (
    <div className="card">
      <h3>Receipt {p.receipt}</h3>
      <dl className="dl">
        <dt>Item</dt><dd>{p.title}</dd>
        <dt>Rights</dt><dd>{rightsTitle(p.rights)}</dd>
        {p.connect && <><dt>Build request</dt><dd>Sent to the architect in the platform and by email</dd></>}
        <dt>Paid with</dt><dd>{p.method === 'card' ? `Card${p.card ? ` ending ${p.card}` : ''}` : p.method === 'points' ? 'Points' : 'Paid-tier free download'}</dd>
        <dt>Total</dt><dd>{p.amount}</dd>
        <dt>Date</dt><dd>{p.date}</dd>
        <dt>Version</dt><dd>{p.version}</dd>
      </dl>
      <p className="small muted">Also emailed to {p.email || 'you@example.com'}.</p>
    </div>
  );
}

export function Purchase() {
  const { id } = useParams();
  const { state, user } = useDemo();
  const p = state.purchases.find((x) => x.id === id && x.userId === user?.id);
  if (!p) return <Page narrow tag="clickable"><Empty title="Purchase not found"><p>It may belong to another role, or the demo data was reset.</p><div><Button to="/purchases">My purchases</Button></div></Empty></Page>;
  return (
    <Page tag="clickable">
      <div className="alert alert-wide">
        <h1>Purchase confirmed</h1>
        <p>Your files are ready. The download link never expires, and you can download again from My purchases.</p>
        <div><Button variant="primary" onClick={() => download(p.title)}>Download files</Button></div>
      </div>
      <Receipt p={p} />
      <div className="row">
        <Button to="/purchases">Go to My purchases</Button>
        <Button to={`/item/${p.itemId}`}>Back to the listing</Button>
        <Button variant="quiet" to="/browse">Browse more spaces</Button>
      </div>
    </Page>
  );
}

export function Purchases() {
  const { state, dispatch, user, get } = useDemo();
  if (!user) return <Page narrow tag="clickable"><RoleGate title="Sign in to see purchases">Visitors cannot buy.</RoleGate></Page>;
  const list = state.purchases.filter((p) => p.userId === user.id);
  return (
    <Page tag="clickable">
      <h1>My purchases</h1>
      {list.length === 0 && (
        <Empty title="Nothing bought yet">
          <p>Redesigns and measured models you buy appear here, ready to download again.</p>
          <div><Button to="/browse">Browse spaces</Button></div>
        </Empty>
      )}
      <ul className="list">
        {list.map((p) => {
          const live = p.kind === 'redesign' ? get.redesign(p.itemId) : p.kind === 'diagram' ? get.diagram(p.itemId)?.d : get.model(p.itemId);
          const gone = !live || live.takenDown || (p.kind === 'redesign' && !live.published);
          const newer = live && p.kind === 'redesign' && live.version > p.version;
          return (
            <li key={p.id} className="row row-top between">
              <div className="stack-sm grow">
                <div className="row"><Badge>{KIND_LABEL[p.kind] || 'Measured model'}</Badge><Badge>Version {p.version}</Badge>{gone && <Badge kind="dashed">No longer for sale</Badge>}</div>
                <Link className="bold" to={`/purchase/${p.id}`}>{p.title}</Link>
                <span className="small muted">{LICENCE.title}, {p.amount}, bought {p.date}, receipt {p.receipt}</span>
                {gone && <span className="small">The listing was removed from sale. You keep your copy.</span>}
                {newer && !gone && <span className="small bold">The architect published version {live.version}.</span>}
              </div>
              <div className="row">
                {newer && !gone && <Button variant="primary" onClick={() => dispatch({ type: 'UPDATE_PURCHASE', id: p.id, version: live.version, title: live.title })}>Update to version {live.version}</Button>}
                <Button onClick={() => download(p.title)}>Download again</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Page>
  );
}
