/* Component sandbox: compare variations of one component side by side, using the
 * real components, tokens and seed data, then preview the one you like in the app.
 *
 * To add a component: export a VARIANTS object next to it ({ id: { name, note } }),
 * add a default to DEFAULTS in design/choices.js, have the component read
 * useChoices(), and add a <Sandbox…> section below.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './styles/tokens.css';
import './styles/app.css';
import './styles/theme-editorial.css';
import './styles/sandbox.css';
import { DemoProvider, useDemo } from './state/DemoContext.jsx';
import { SpaceCard, SPACE_CARD_VARIANTS } from './components/domain.jsx';
import { LANDING_VARIANTS } from './pages/Public.jsx';
import { Badge, Button } from './components/ui.jsx';
import { NotesBridge } from './components/Shell.jsx';
import { DEFAULTS, resetChoices, setChoice, useChoices } from './design/choices.js';

const appUrl = (hash = '') => `${import.meta.env.BASE_URL}${import.meta.env.PROD ? `#${hash}` : hash.slice(1)}`;

function ChoiceBar({ group, id }) {
  const choices = useChoices();
  const inUse = choices[group] === id;
  return (
    <div className="row">
      {DEFAULTS[group] === id && <Badge>Default</Badge>}
      {inUse ? <Badge kind="solid">Showing in the app</Badge> : <Button onClick={() => setChoice(group, id)}>Preview in the app</Button>}
    </div>
  );
}

// Clicks inside a preview stay in the sandbox.
const Frame = ({ children, className = '' }) => (
  <div className={`sb-frame ${className}`} onClickCapture={(e) => { if (e.target.closest('a')) e.preventDefault(); }}>{children}</div>
);

function SandboxSpaceCards() {
  const { get } = useDemo();
  const samples = ['s3', 's7', 's11'].map(get.space);
  return (
    <section className="stack-lg" data-screen-label="Space card">
      <div className="stack-sm">
        <h2>Space card</h2>
        <p className="prose small">Used on Browse spaces and under Recently documented. The question: where does the space type go, so it doesn’t sit in the same line as the counts? Samples: the most-voted space, a pending space that’s ready for approval, and the longest name.</p>
      </div>
      {Object.entries(SPACE_CARD_VARIANTS).map(([id, v]) => (
        <article key={id} className="sb-variant" data-screen-label={`Space card: ${v.name}`}>
          <div className="sb-variant-head">
            <div className="stack-sm">
              <h3>{v.name}</h3>
              <p className="small muted prose">{v.note}</p>
            </div>
            <ChoiceBar group="spaceCard" id={id} />
          </div>
          <Frame>
            <div className="grid grid-tight">
              {samples.map((s) => <SpaceCard key={s.id} space={s} variant={id} headingLevel={4} />)}
            </div>
          </Frame>
        </article>
      ))}
    </section>
  );
}

function SandboxLanding() {
  return (
    <section className="stack-lg" data-screen-label="Landing section">
      <div className="stack-sm">
        <h2>Landing: the section under the hero</h2>
        <p className="prose small">What the landing page explains first. All three end with the same co-op block. Every statement comes from the dev spec.</p>
      </div>
      {Object.entries(LANDING_VARIANTS).map(([id, v]) => (
        <article key={id} className="sb-variant" data-screen-label={`Landing: ${v.name}`}>
          <div className="sb-variant-head">
            <div className="stack-sm">
              <h3>{v.name}</h3>
              <p className="small muted prose">{v.note}</p>
            </div>
            <ChoiceBar group="landing" id={id} />
          </div>
          <Frame className="sb-frame-page"><div className="stack-lg">{v.render()}</div></Frame>
        </article>
      ))}
    </section>
  );
}

function Sandbox() {
  const choices = useChoices();
  const changed = Object.keys(DEFAULTS).filter((k) => choices[k] !== DEFAULTS[k]);
  return (
    <>
      <header className="header">
        <div className="header-in">
          <a className="brand" href={appUrl('/')}>ReSpace</a>
          <span className="small muted grow">Component sandbox</span>
          <a className="btn" href={appUrl('/browse')}>Back to the prototype</a>
        </div>
      </header>
      <main className="page stack-lg" data-screen-label="page">
        <div className="stack">
          <h1>Component sandbox</h1>
          <p className="prose">Compare versions of a component side by side. “Preview in the app” switches the prototype to that version in this browser only, so you can try it in real flows. Once you pick, tell Claude (or change <code>DEFAULTS</code> in <code>src/design/choices.js</code>) so everyone sees it.</p>
          {changed.length > 0 && (
            <p className="note">
              Previewing in this browser: {changed.map((k) => `${k} = ${choices[k]}`).join(', ')}.{' '}
              <button type="button" className="link-btn" onClick={resetChoices}>Back to defaults</button>
            </p>
          )}
        </div>
        <SandboxSpaceCards />
        <hr className="rule" />
        <SandboxLanding />
      </main>
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MemoryRouter>
      <DemoProvider>
        <Sandbox />
        <NotesBridge page="sandbox" />
      </DemoProvider>
    </MemoryRouter>
  </React.StrictMode>,
);
