// Design choices made in the sandbox (sandbox.html).
// DEFAULTS is what everyone sees, including the GitHub Pages link.
// "Preview in the app" in the sandbox saves an override in this browser only.
import { useSyncExternalStore } from 'react';

export const DEFAULTS = {
  spaceCard: 'label', // see SPACE_CARD_VARIANTS in components/domain.jsx
  landing: 'steps', // see LANDING_VARIANTS in pages/Public.jsx
  createFlow: 'inline', // Create new space: 'inline' (A), 'overlay' (B: photos first in an overlay), 'confirm' (C: nearby-space confirmation overlay after the area)
  landingLayout: 'classic', // 'classic' (hero then sections) or 'map' (the map is the landing page)
};

const KEY = 'isp-design-choices';
const listeners = new Set();

function read() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

let current = read();

export function setChoice(name, value) {
  const overrides = { ...current, [name]: value };
  Object.keys(overrides).forEach((k) => { if (overrides[k] === DEFAULTS[k]) delete overrides[k]; });
  try { localStorage.setItem(KEY, JSON.stringify(overrides)); } catch { /* storage unavailable: choice lasts this visit */ }
  current = { ...DEFAULTS, ...overrides };
  listeners.forEach((l) => l());
}

export function resetChoices() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  current = { ...DEFAULTS };
  listeners.forEach((l) => l());
}

const subscribe = (l) => {
  listeners.add(l);
  const onStorage = (e) => { if (e.key === KEY) { current = read(); l(); } };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(l); window.removeEventListener('storage', onStorage); };
};

export const useChoices = () => useSyncExternalStore(subscribe, () => current);
